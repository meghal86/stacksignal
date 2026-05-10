const { exec } = require('child_process');
const os = require('os');

const platform = os.platform();

function execute(command) {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            resolve({ error, stdout: stdout.trim(), stderr: stderr.trim() });
        });
    });
}

// OS-specific time formatter
function formatTimeArg(timeArg, isWindows) {
    const isoMatch = timeArg.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})$/);
    if (!isoMatch) return timeArg; // Let 'at' try parsing relative times on Unix
    
    const [_, year, month, day, time] = isoMatch;
    if (isWindows) {
        // schtasks format: MM/DD/YYYY
        return { time, date: `${month}/${day}/${year}` };
    } else {
        // at format: HH:mm MM/DD/YYYY
        return `${time} ${month}/${day}/${year}`;
    }
}

async function schedule(timeArg, task, userId, channel, timezone) {
    if (!userId || !channel || !timezone) {
        console.error("❌ Error: Missing required arguments: userId, channel, timezone");
        return;
    }

    const now = new Date().toLocaleString('en-US', { timeZone: timezone });
    
    // Inject system metadata into the payload
    const instruction = `[System: Scheduled Task Executed] 
- Created at: ${now}
- Scheduled for: ${timeArg}
- Original instruction: ${task}`;
    
    // Escape single quotes for shell safety
    const safeInstruction = instruction.replace(/'/g, "'\\''");
    const agentCommand = `openclaw agent --message '${safeInstruction}' --to '${userId}' --channel '${channel}'`;

    if (platform === 'win32') {
        const formatted = formatTimeArg(timeArg, true);
        if (typeof formatted === 'string') {
            console.error("❌ Error: On Windows, time must be strictly in YYYY-MM-DD HH:mm format.");
            return;
        }
        
        const taskId = `OpenClaw_Task_${Date.now()}`;
        
        // Flatten newlines for Windows CMD compatibility
        const flatInstruction = instruction.replace(/\n/g, ' - ');
        const winCmd = `schtasks /create /tn "${taskId}" /tr "openclaw agent --message \\"${flatInstruction}\\" --to \\"${userId}\\" --channel \\"${channel}\\"" /sc ONCE /st ${formatted.time} /sd ${formatted.date} /f`;
        
        const res = await execute(winCmd);
        if (res.error) {
            console.error(`❌ Error scheduling task on Windows:`, res.stderr || res.stdout);
        } else {
            console.log(`✅ Task successfully scheduled for: ${timeArg} (Task ID: ${taskId})`);
        }
    } else {
        const formattedTime = formatTimeArg(timeArg, false);
        const atCmd = `echo "${agentCommand} >> /tmp/to-do.log 2>&1" | TZ="${timezone}" at "${formattedTime}"`;
        const res = await execute(atCmd);
        const output = res.stderr || res.stdout;
        
        console.log(output);
        if (output.includes('job')) {
            console.log(`✅ Task successfully scheduled for: ${timeArg} (${timezone})`);
        } else {
            console.error("❌ Failed to schedule via 'at':", output);
        }
    }
}

async function list() {
    if (platform === 'win32') {
        const res = await execute('schtasks /query /fo LIST /tn "OpenClaw_Task_*"');
        if (res.error || res.stdout.includes('ERROR:')) {
            console.log("No pending tasks.");
            return;
        }
        console.log(res.stdout);
    } else {
        const res = await execute('atq | sort -k 6,6 -k 3,3 -k 4,4 -k 5,5');
        if (!res.stdout) {
            console.log("No pending tasks.");
            return;
        }
        
        console.log("ID\tExecution Time\t\t\tTask Description");
        console.log("--\t--------------\t\t\t----------------");
        
        const lines = res.stdout.split('\n');
        for (const line of lines) {
            const parts = line.split(/\s+/);
            if (parts.length < 2) continue;
            
            const id = parts[0];
            const dateStr = parts.slice(1, 6).join(' '); 
            
            // Fetch task details to extract the instruction snippet
            const detailRes = await execute(`at -c ${id}`);
            const match = detailRes.stdout.match(/--message '\[System: Scheduled Task Executed\] \\n- Created at: .*? \\n- Scheduled for: .*? \\n- Original instruction: (.*?)'/); 
            const matchFallback = detailRes.stdout.match(/Original instruction: (.*?)'/);
            
            let desc = match ? match[1] : (matchFallback ? matchFallback[1] : "(Unknown task)");
            console.log(`${id}\t${dateStr}\t${desc}`);
        }
    }
}

async function remove(id) {
    if (!id) {
        console.log("Usage: node skills/to-do/to-do.js delete <id>");
        return;
    }
    
    if (platform === 'win32') {
        const res = await execute(`schtasks /delete /tn "${id}" /f`);
        if (res.error) console.error("Error:", res.stderr);
        else console.log(`🗑️ Task ${id} deleted.`);
    } else {
        const res = await execute(`atrm ${id}`);
        if (res.error) console.error("Error:", res.stderr);
        else console.log(`🗑️ Task #${id} deleted.`);
    }
}

// CLI Routing
const args = process.argv.slice(2);
const action = args[0];

(async () => {
    try {
        if (action === 'schedule') {
            const timeArg = args[1];
            const task = args[2];
            const userId = args[3];
            const channel = args[4];
            const timezone = args[5];
            
            if (!timeArg || !task || !userId || !channel || !timezone) {
                console.log('Usage: node skills/to-do/to-do.js schedule "YYYY-MM-DD HH:mm" "Instruction" "USER_ID" "CHANNEL" "TIMEZONE"');
            } else {
                await schedule(timeArg, task, userId, channel, timezone);
            }
        } else if (action === 'list') {
            await list();
        } else if (action === 'delete' || action === 'remove') {
            await remove(args[1]);
        } else {
            console.log(`
To-Do Skill (Cross-Platform)
--------------------------------------------------
Commands:
  schedule "<time>" "<task>" "<userId>" "<channel>" "<tz>"  - Schedule a new task
  list                                                      - List pending tasks
  delete <id>                                               - Remove a task
`);
        }
    } catch (err) {
        console.error("Fatal Error:", err);
    }
})();