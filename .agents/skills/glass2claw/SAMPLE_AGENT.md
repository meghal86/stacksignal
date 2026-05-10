# Vision Routing Guidance (Sample)

Add this logic to your Agent prompt to enable organized visual routing.

## 👁️ Visual Routing Protocol

When an image is received from a mobile ingress channel, follow this workflow:

### 1. Ingress Handling
- **Action**: Forward the capture to your designated central Hub session.
- **Goal**: Maintain a single point of entry for all visual analysis.

### 2. Hub Classification
- **Action**: Identify if the image represents Wine, Tea, or a Professional Contact.
- **Constraint**: Retrieve the target Database ID only from `configs/vision_router.md`.
- **Dispatch**: Send the metadata to the appropriate specialist session for processing.

### 3. Safety Guidance
- Ensure all inter-session messaging stays within authorized private contexts.
- Use only the standard platform tools to interact with external APIs.
