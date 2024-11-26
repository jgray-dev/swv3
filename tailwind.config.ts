import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "InterFallback"],
      },
    },
  },
  plugins: [require("tailwind-scrollbar")],
} satisfies Config;
