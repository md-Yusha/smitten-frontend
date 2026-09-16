/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#FFFFFF",
        peach: "#FAE3D9",
        ink: "#1A1A1A",
        muted: "#666666",
        accent: "#F05A28",
        "accent-deep": "#E65100",
        "partner-bubble": "#FCE4EC",
        background: "#FFFFFF",
        surface: "#FFFFFF",
        border: "rgba(26, 26, 26, 0.08)",
        text: "#1A1A1A",
      },
      fontFamily: {
        serif: ["PlayfairDisplay_700Bold"],
        "serif-md": ["PlayfairDisplay_600SemiBold"],
        sans: ["Inter_400Regular"],
        "sans-md": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
