export const TYPE_OPTIONS = [
  { label: "MCQ", value: "MCQ" },
  { label: "Multiple Select", value: "MSQ" },
  { label: "Fill in the Blank", value: "FILL_BLANK" },
  { label: "Integer Type", value: "INTEGER" },
  { label: "Matching", value: "MATCH" },
  { label: "Drag and Drop", value: "DRAG_DROP" },
  { label: "True / False", value: "TRUE_FALSE" }
];

export const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"];

export const TYPE_HELP = {
  MCQ: "One correct option from A/B/C/D.",
  MSQ: "More than one correct option allowed.",
  FILL_BLANK: "Student types the correct text.",
  INTEGER: "Student types an integer number.",
  MATCH: "Left items matched to right items.",
  DRAG_DROP: "Student arranges items in correct order.",
  TRUE_FALSE: "Student chooses True or False."
};

export const MODULES = {
  Hardware: [
    "Input & Output Devices",
    "CPU (ALU, CU, Registers)",
    "Memory (RAM, ROM, Cache)",
    "Storage Devices (HDD, SSD)",
    "Motherboard & Components",
    "Number Systems (Binary, Hexadecimal)",
    "Computer Architecture Basics"
  ],
  Networking: [
    "OSI Model",
    "TCP/IP Model",
    "IP Addressing (IPv4, IPv6)",
    "Subnetting",
    "Routing & Switching",
    "Network Devices (Router, Switch, Hub)",
    "Protocols (HTTP, HTTPS, FTP, DNS)"
  ],
  Aptitude: [
    "Profit & Loss",
    "Time & Work",
    "Time, Speed & Distance",
    "Percentages",
    "Ratio & Proportion",
    "Simple & Compound Interest",
    "Probability"
  ],
  "Operating System (OS)": [
    "Process & Thread",
    "CPU Scheduling Algorithms",
    "Deadlocks",
    "Memory Management",
    "Paging & Segmentation",
    "File Systems",
    "Synchronization"
  ],
  "Logical Reasoning": [
    "Coding-Decoding",
    "Blood Relations",
    "Direction Sense",
    "Number Series",
    "Puzzles",
    "Syllogism",
    "Analogy"
  ]
};

export const MODULE_OPTIONS = Object.keys(MODULES);

export function parsePairs(text) {
  return text
    .split("\n")
    .map((line) => {
      const [left, right] = line.split("|");
      return { left: (left || "").trim(), right: (right || "").trim() };
    })
    .filter((p) => p.left && p.right);
}

export function pairsToText(pairs) {
  if (!Array.isArray(pairs)) return "";
  return pairs.map((p) => `${p.left}|${p.right}`).join("\n");
}

export function buildDragDropPairs(orderText) {
  const items = orderText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return items.map((item, idx) => ({ left: `Slot ${idx + 1}`, right: item }));
}
