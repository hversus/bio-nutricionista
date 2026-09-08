import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{js,ts,jsx,tsx}"], theme: { extend: { colors: { ink: "#24312d", sage: "#788f7b", cream: "#f8f6f0", blush: "#eadbd3" }, fontFamily: { sans: ["Arial", "sans-serif"] } } }, plugins: [] } satisfies Config;
