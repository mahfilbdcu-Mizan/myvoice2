// Display names and descriptions matching the provider's own Imagen 2 tool
export const IMAGE_MODEL_LABELS: Record<string, { label: string; description: string }> = {
  "gpt-image-2.5-sunburst": {
    label: "GPT Image 2.5 Sunburst",
    description: "Detailed images, precise editing, quality up to Maximum.",
  },
  "gpt-image-2.5-flare": {
    label: "GPT Image 2.5 Flare",
    description: "Image generation and editing with five quality levels.",
  },
  "recraft-v4": {
    label: "Recraft V4",
    description: "Design-focused images with style references.",
  },
  "recraft-v4.1": {
    label: "Recraft 4.1",
    description: "Design-focused, strong prompt control, clean composition.",
  },
  "bytedance-seedream-5-pro": {
    label: "Seedream 5 Pro",
    description: "Precise editing, multilingual text, dense infographics.",
  },
  "bytedance-seedream-5-lite": {
    label: "Seedream 5 Lite",
    description: "Up to 3K, multi-image editing, good for product images.",
  },
  "bytedance-seedream-4.5": {
    label: "Seedream 4.5",
    description: "Upto 4K, multi-image edits, preserves details, dense text.",
  },
  "bytedance-seedream-4": {
    label: "Seedream 4",
    description: "Upto 4K, strong aesthetics, reference-driven editing.",
  },
  "gpt-image-2": {
    label: "GPT Image 2",
    description: "Precise text rendering, multilingual, high prompt control, 4K.",
  },
  "gpt-image-1.5": {
    label: "GPT Image 1.5",
    description: "Strong prompt adherence, detail preservation, fast.",
  },
  "gpt-image-1": {
    label: "GPT Image 1",
    description: "Good prompt adherence, legible text, detailed editing.",
  },
  "gemini-3.1-flash-lite-image": {
    label: "Nano Banana 2 Lite",
    description: "Fast generation and editing, great for rapid iteration.",
  },
  "gemini-3.1-flash-image-preview": {
    label: "Nano Banana 2",
    description: "World knowledge, precise text, consistent characters, fast.",
  },
  "gemini-3-pro-image-preview": {
    label: "Nano Banana Pro",
    description: "Studio quality control, legible text, incredible consistency.",
  },
  "gemini-2.5-flash-image": {
    label: "Nano Banana",
    description: "Quick, high-quality generation and editing.",
  },
  "krea-2-medium": {
    label: "Krea 2 Medium",
    description: "Fast, aesthetic images, supports style references.",
  },
  "krea-2-large": {
    label: "Krea 2 Large",
    description: "Aesthetic images with creative control using style references.",
  },
  "kling-omni-image": {
    label: "Kling O1 Image",
    description: "Precise editing, strong reference control, visual consistency.",
  },
  "flux-2-pro": {
    label: "FLUX.2 [Pro]",
    description: "Real-world lighting, spatial accuracy, character consistency.",
  },
  "flux-1-kontext": {
    label: "FLUX.1 Kontext [Pro]",
    description: "Image generation and editing, scene coherence, style control.",
  },
  "runway-gen4-image": {
    label: "Gen-4 Image",
    description: "Stylistic visual and camera control, text rendering.",
  },
  "runway-gen4-image-turbo": {
    label: "Gen-4 Image Turbo",
    description: "Like Gen4-Image, fast, cost-efficient.",
  },
  "wan-2.5-preview-image": {
    label: "Wan 2.5 Image",
    description: "Strong prompt fidelity and motion awareness.",
  },
};

export function imageModelLabel(modelId: string): string {
  return IMAGE_MODEL_LABELS[modelId]?.label ?? modelId;
}

export function imageModelDescription(modelId: string): string {
  return IMAGE_MODEL_LABELS[modelId]?.description ?? "";
}
