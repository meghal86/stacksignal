"use client";

import { useState } from "react";
import type { BuildRoomContent, FinancialModel } from "@/lib/build-room/types";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function calculateProjection(
  avgPrice: number,
  customersPerWeek: number,
  churnRate: number,
  monthlyFixed: number,
  variablePerCustomer: number
) {
  let customers = 0;
  return Array.from({ length: 12 }, (_, index) => {
    customers = customers * (1 - churnRate) + customersPerWeek * 4.3;
    const mrr = customers * avgPrice;
    const costs = monthlyFixed + customers * variablePerCustomer;
    return {
      month: index + 1,
      customers,
      mrr,
      costs,
      profit: mrr - costs,
    };
  });
}

function fixedCosts(model?: FinancialModel | null) {
  if (model?.monthlyFixedCosts?.length) return model.monthlyFixedCosts;
  return [{ tool: "Core tools", cost: model?.totalMonthlyFixed ?? model?.burn ?? 0, required: true }];
}

export function FinancialsTab({ content }: { content: BuildRoomContent }) {
  const model = content.financialModel;
  const [hourlyRate, setHourlyRate] = useState(150);
  const [weeksToBuild, setWeeksToBuild] = useState(Math.max(1, Math.round((model?.totalBuildHours ?? 240) / 40)));
  const [avgPrice, setAvgPrice] = useState(model?.suggestedPricing?.growth?.price ?? model?.suggestedPricing?.starter?.price ?? 299);
  const [customersPerWeek, setCustomersPerWeek] = useState(2);
  const [churnRate, setChurnRate] = useState(3);
  const costs = fixedCosts(model);
  const monthlyFixed = model?.totalMonthlyFixed ?? costs.reduce((sum, item) => sum + item.cost, 0);
  const variablePerCustomer = model?.variableCostPerCustomer ?? 0;
  const buildHours = weeksToBuild * 40;
  const buildCost = hourlyRate * buildHours;
  const breakEvenCustomers = Math.max(0, Math.ceil(monthlyFixed / Math.max(1, avgPrice - variablePerCustomer)));
  const projection = calculateProjection(avgPrice, customersPerWeek, churnRate / 100, monthlyFixed, variablePerCustomer);
  const breakEvenMonth = projection.find((row) => row.profit > 0)?.month ?? 12;
  const month24Profit = projection.reduce((sum, row) => sum + row.profit, 0) * 2 - buildCost;
  const roi = buildCost > 0 ? (month24Profit / buildCost) * 100 : 0;

  const downloadCsv = () => {
    const rows = [
      ["Month", "Customers", "MRR", "Costs", "Profit"],
      ...projection.map((row) => [
        row.month,
        row.customers.toFixed(1),
        row.mrr.toFixed(0),
        row.costs.toFixed(0),
        row.profit.toFixed(0),
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-model-${content.analysisId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-5">
        <Slider label="Your hourly rate" value={hourlyRate} min={25} max={500} step={5} suffix="/hr" prefix="$" onChange={setHourlyRate} />
        <Slider label="Weeks to build" value={weeksToBuild} min={1} max={52} step={1} suffix=" weeks" onChange={setWeeksToBuild} />
        <Slider label="Average monthly price" value={avgPrice} min={9} max={999} step={10} prefix="$" suffix="/mo" onChange={setAvgPrice} />
        <Slider label="Customers per week" value={customersPerWeek} min={0.5} max={20} step={0.5} onChange={setCustomersPerWeek} />
        <Slider label="Monthly churn rate" value={churnRate} min={1} max={20} step={1} suffix="%" onChange={setChurnRate} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="One-time build cost" value={currency(buildCost)} detail={`${buildHours} hours of your time`} />
        <Metric title="Monthly fixed costs" value={`${currency(monthlyFixed)}/mo`} detail={`${costs.length} tools included`} />
        <Metric title="Variable cost" value={`${currency(variablePerCustomer)}/customer`} detail={model?.variableCostExplanation ?? "Estimated monthly usage cost"} />
        <Metric title="Break-even" value={`${breakEvenCustomers} customers`} detail={`Estimated month ${breakEvenMonth}`} />
      </div>

      <div className="border border-[#E8E4DD] bg-white">
        <div className="border-b border-[#E8E4DD] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em]">Monthly fixed costs</div>
        <div className="divide-y divide-[#E8E4DD]">
          {costs.map((item) => (
            <div key={item.tool} className="flex items-center justify-between px-5 py-3 text-sm">
              <span>{item.tool} {item.tier ? `(${item.tier})` : ""}</span>
              <span className="font-mono">{currency(item.cost)}/mo</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[#E8E4DD] bg-white">
        <div className="border-b border-[#E8E4DD] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em]">12-month projections</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[#F5F0E8] text-left font-mono text-[11px] uppercase tracking-[0.14em] text-[#1A1A1A]/60">
              <tr>
                <th className="p-4">Month</th>
                <th className="p-4">Customers</th>
                <th className="p-4">MRR</th>
                <th className="p-4">Costs</th>
                <th className="p-4">Profit</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((row) => (
                <tr key={row.month} className="border-t border-[#E8E4DD]">
                  <td className="p-4 font-mono">{row.month}</td>
                  <td className="p-4">{row.customers.toFixed(1)}</td>
                  <td className="p-4">{currency(row.mrr)}</td>
                  <td className="p-4">{currency(row.costs)}</td>
                  <td className={`p-4 font-bold ${row.profit >= 0 ? "text-[#00B8A0]" : "text-[#FF2B2B]"}`}>{currency(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(model?.scenarios ?? {}).map(([name, scenario]) => (
          <div key={name} className="border border-[#E8E4DD] bg-white p-5">
            <p className="font-heading text-2xl font-black capitalize text-[#1A1A1A]">{name}</p>
            <p className="mt-2 min-h-12 text-sm text-[#1A1A1A]/60">{scenario?.assumption}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MiniMetric title="M3" value={currency(scenario?.month3MRR ?? 0)} />
              <MiniMetric title="M6" value={currency(scenario?.month6MRR ?? 0)} />
              <MiniMetric title="M12" value={currency(scenario?.month12MRR ?? 0)} />
            </div>
          </div>
        ))}
      </div>

      <div className="border border-[#1A1A1A] bg-[#F5F0E8] p-6">
        <p className="font-heading text-2xl font-black text-[#1A1A1A]">ROI calculator</p>
        <p className="mt-2 text-sm text-[#1A1A1A]/70">
          If you invest {buildHours} hours at {currency(hourlyRate)}/hour, payback is estimated around month {breakEvenMonth}.
        </p>
        <p className="mt-3 text-3xl font-black text-[#FF4800]">{currency(month24Profit)} 24-month return ({roi.toFixed(0)}% ROI)</p>
        <button
          type="button"
          onClick={downloadCsv}
          className="mt-5 border border-[#1A1A1A] bg-[#1A1A1A] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white"
        >
          Download Financial Model as CSV
        </button>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  prefix = "",
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="border border-[#E8E4DD] bg-white p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A]/55">{label}</span>
      <span className="mt-2 block font-heading text-2xl font-black text-[#1A1A1A]">
        {prefix}
        {value}
        {suffix}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-[#FF4800]"
      />
    </label>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="border border-[#E8E4DD] bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A]/55">{title}</p>
      <p className="mt-2 font-heading text-3xl font-black text-[#FF4800]">{value}</p>
      <p className="mt-2 text-xs text-[#1A1A1A]/55">{detail}</p>
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="border border-[#E8E4DD] bg-[#F5F0E8] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#1A1A1A]/55">{title}</p>
      <p className="mt-1 font-bold text-[#1A1A1A]">{value}</p>
    </div>
  );
}
