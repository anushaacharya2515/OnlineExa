import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { User } from "./models/User.js";
import { Question } from "./models/Question.js";

export async function ensureAdmin() {
  const existingAdmin = await User.findOne({ role: "admin" }).lean();
  if (existingAdmin) return;

  const passwordHash = await bcrypt.hash("admin123", 10);
  await User.create({
    id: uuidv4(),
    name: "System Admin",
    email: "admin@exam.com",
    passwordHash,
    role: "admin",
    createdAt: new Date().toISOString()
  });
}

export async function ensureReferenceQuestionBank() {
  const samples = [
    {
      type: "SINGLE_MCQ",
      text: "Which data structure follows FIFO order?",
      options: ["Stack", "Queue", "Tree", "Graph"],
      correctAnswer: "Queue",
      marks: 1
    },
    {
      type: "MSQ",
      text: "Which of the following are prime numbers?",
      options: ["2", "3", "4", "5"],
      correctAnswer: ["2", "3", "5"],
      marks: 2
    },
    {
      type: "NAT",
      text: "What is 12 x 12?",
      correctAnswer: 144,
      marks: 1
    },
    {
      type: "INTEGER_RANGE",
      text: "Enter any integer between 10 and 15.",
      integerRange: { min: 10, max: 15 },
      correctAnswer: "10-15",
      marks: 1
    },
    {
      type: "ASSERTION_REASON",
      text: "Select the correct relation for the given assertion and reason.",
      assertion: "Earth revolves around the Sun.",
      reason: "The Sun's gravitational pull keeps Earth in orbit.",
      options: [
        "A and R are true, R explains A",
        "A and R are true, R does not explain A",
        "A is true, R is false",
        "A is false, R is true"
      ],
      correctAnswer: "A and R are true, R explains A",
      marks: 2
    },
    {
      type: "PARAGRAPH_CASE",
      text: "Based on the paragraph, identify the correct process.",
      passage: "Photosynthesis is a process where green plants use sunlight to synthesize foods from carbon dioxide and water.",
      options: ["Respiration", "Photosynthesis", "Fermentation", "Transpiration"],
      correctAnswer: "Photosynthesis",
      marks: 2
    },
    {
      type: "SINGLE_MCQ",
      text: "Which protocol is primarily used for secure web browsing?",
      options: ["HTTP", "FTP", "HTTPS", "SMTP"],
      correctAnswer: "HTTPS",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "Which gas do plants absorb from the atmosphere?",
      options: ["Oxygen", "Hydrogen", "Carbon dioxide", "Nitrogen"],
      correctAnswer: "Carbon dioxide",
      marks: 1
    },
    {
      type: "MSQ",
      text: "Select all valid object-oriented programming concepts.",
      options: ["Encapsulation", "Inheritance", "Polymorphism", "Compilation"],
      correctAnswer: ["Encapsulation", "Inheritance", "Polymorphism"],
      marks: 2
    },
    {
      type: "MSQ",
      text: "Which of these are JavaScript frameworks/libraries?",
      options: ["React", "Angular", "Django", "Vue"],
      correctAnswer: ["React", "Angular", "Vue"],
      marks: 2
    },
    {
      type: "NAT",
      text: "What is the square root of 256?",
      correctAnswer: 16,
      marks: 1
    },
    {
      type: "NAT",
      text: "If x = 7, compute 3x + 2.",
      correctAnswer: 23,
      marks: 1
    },
    {
      type: "INTEGER_RANGE",
      text: "Enter any integer between 1 and 5.",
      integerRange: { min: 1, max: 5 },
      correctAnswer: "1-5",
      marks: 1
    },
    {
      type: "INTEGER_RANGE",
      text: "Enter an integer in the range 20 to 25.",
      integerRange: { min: 20, max: 25 },
      correctAnswer: "20-25",
      marks: 1
    },
    {
      type: "PARAGRAPH_CASE",
      text: "From the paragraph, which layer handles routing in the OSI model?",
      passage: "The OSI model includes seven layers. The Network layer is responsible for routing and logical addressing.",
      options: ["Data Link", "Transport", "Network", "Physical"],
      correctAnswer: "Network",
      marks: 2
    },
    {
      type: "ASSERTION_REASON",
      text: "Select the correct relation for the given assertion and reason.",
      assertion: "All squares are rectangles.",
      reason: "A square has four right angles.",
      options: [
        "A and R are true, R explains A",
        "A and R are true, R does not explain A",
        "A is true, R is false",
        "A is false, R is true"
      ],
      correctAnswer: "A and R are true, R explains A",
      marks: 2
    },
    {
      type: "ASSERTION_REASON",
      text: "Select the correct relation for the given assertion and reason.",
      assertion: "Water boils at 100°C at sea level.",
      reason: "Boiling point depends on atmospheric pressure.",
      options: [
        "A and R are true, R explains A",
        "A and R are true, R does not explain A",
        "A is true, R is false",
        "A is false, R is true"
      ],
      correctAnswer: "A and R are true, R explains A",
      marks: 2
    },
    {
      type: "DRAG_DROP",
      text: "Match each country with its capital.",
      pairs: [
        { left: "India", right: "New Delhi" },
        { left: "Japan", right: "Tokyo" },
        { left: "France", right: "Paris" }
      ],
      correctAnswer: {
        India: "New Delhi",
        Japan: "Tokyo",
        France: "Paris"
      },
      marks: 3
    },
    {
      type: "MATRIX",
      text: "Match programming languages to their common use areas.",
      matrixRows: ["Python", "JavaScript", "SQL"],
      matrixCols: ["Web", "Data", "Database"],
      correctAnswer: {
        Python: ["Data", "Web"],
        JavaScript: ["Web"],
        SQL: ["Database"]
      },
      marks: 3
    },
    {
      type: "SINGLE_MCQ",
      text: "Which HTML tag is used for the largest heading?",
      options: ["<h6>", "<head>", "<h1>", "<header>"],
      correctAnswer: "<h1>",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "What does CPU stand for?",
      options: ["Central Process Unit", "Central Processing Unit", "Computer Personal Unit", "Core Processing Utility"],
      correctAnswer: "Central Processing Unit",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "Which device forwards data packets between networks?",
      options: ["Switch", "Router", "Repeater", "Hub"],
      correctAnswer: "Router",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "Which layer of the OSI model is responsible for IP addressing and routing?",
      options: ["Transport", "Network", "Data Link", "Session"],
      correctAnswer: "Network",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "Which protocol is used to automatically assign IP addresses in a LAN?",
      options: ["DNS", "DHCP", "ARP", "ICMP"],
      correctAnswer: "DHCP",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "What is the default port number for HTTPS?",
      options: ["21", "25", "443", "110"],
      correctAnswer: "443",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "Which memory is volatile and loses data when power is off?",
      options: ["ROM", "SSD", "RAM", "HDD"],
      correctAnswer: "RAM",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "A subnet mask of 255.255.255.0 corresponds to which CIDR notation?",
      options: ["/16", "/24", "/28", "/32"],
      correctAnswer: "/24",
      marks: 1
    },
    {
      type: "MSQ",
      text: "Which are valid private IPv4 address ranges?",
      options: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "8.8.8.0/24"],
      correctAnswer: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
      marks: 2
    },
    {
      type: "MSQ",
      text: "Which are core components inside a computer cabinet?",
      options: ["Motherboard", "CPU", "RAM", "Projector"],
      correctAnswer: ["Motherboard", "CPU", "RAM"],
      marks: 2
    },
    {
      type: "DRAG_DROP",
      text: "Match network devices with their primary function.",
      pairs: [
        { left: "Router", right: "Routes packets between networks" },
        { left: "Switch", right: "Connects devices in a LAN" },
        { left: "Firewall", right: "Filters network traffic by rules" }
      ],
      correctAnswer: {
        Router: "Routes packets between networks",
        Switch: "Connects devices in a LAN",
        Firewall: "Filters network traffic by rules"
      },
      marks: 3
    },
    {
      type: "MATRIX",
      text: "Map protocols to their common usage areas.",
      matrixRows: ["HTTP", "SSH", "SMTP"],
      matrixCols: ["Web Browsing", "Remote Login", "Email Transfer"],
      correctAnswer: {
        HTTP: ["Web Browsing"],
        SSH: ["Remote Login"],
        SMTP: ["Email Transfer"]
      },
      marks: 3
    },
    {
      type: "NAT",
      text: "If a server sends 1200 packets and 5% are dropped, how many packets are dropped?",
      correctAnswer: 60,
      marks: 1
    },
    {
      type: "INTEGER_RANGE",
      text: "Enter any valid host number in a /30 subnet (usable hosts count).",
      integerRange: { min: 1, max: 2 },
      correctAnswer: "1-2",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "A number is increased by 20% and becomes 240. What was the original number?",
      options: ["180", "190", "200", "220"],
      correctAnswer: "200",
      marks: 1
    },
    {
      type: "NAT",
      text: "Find the average of 12, 15, 18, 21, 24.",
      correctAnswer: 18,
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "If the ratio of boys to girls is 3:2 and total students are 50, how many girls are there?",
      options: ["20", "25", "30", "35"],
      correctAnswer: "20",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "A train travels 180 km in 3 hours. Its speed is:",
      options: ["45 km/h", "50 km/h", "60 km/h", "75 km/h"],
      correctAnswer: "60 km/h",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "Find the next number in the series: 2, 6, 12, 20, 30, ?",
      options: ["36", "40", "42", "44"],
      correctAnswer: "42",
      marks: 1
    },
    {
      type: "PARAGRAPH_CASE",
      text: "Based on the paragraph, choose the best explanation.",
      passage: "A web server hosts applications and listens on specific ports. A reverse proxy can forward incoming requests to backend services for load balancing and security.",
      options: [
        "Reverse proxy only stores static files",
        "Reverse proxy forwards requests to backend services",
        "Web server cannot listen on ports",
        "Load balancing is unrelated to servers"
      ],
      correctAnswer: "Reverse proxy forwards requests to backend services",
      marks: 2
    },
    {
      type: "SINGLE_MCQ",
      text: "Which device separates broadcast domains in a LAN?",
      options: ["Hub", "Switch", "Router", "Repeater"],
      correctAnswer: "Router",
      marks: 1
    },
    {
      type: "SINGLE_MCQ",
      text: "How many usable hosts are available in a /29 subnet?",
      options: ["2", "6", "8", "14"],
      correctAnswer: "6",
      marks: 1
    },
    {
      type: "NAT",
      text: "If a network has /28 mask, how many total IP addresses are in that subnet?",
      correctAnswer: 16,
      marks: 1
    },
    {
      type: "MSQ",
      text: "Which protocols operate at the Transport layer?",
      options: ["TCP", "UDP", "IP", "ICMP"],
      correctAnswer: ["TCP", "UDP"],
      marks: 2
    },
    {
      type: "DRAG_DROP",
      text: "Match server types with their primary roles.",
      pairs: [
        { left: "Web Server", right: "Serves web pages and APIs" },
        { left: "Database Server", right: "Stores and queries data" },
        { left: "Mail Server", right: "Handles email delivery" }
      ],
      correctAnswer: {
        "Web Server": "Serves web pages and APIs",
        "Database Server": "Stores and queries data",
        "Mail Server": "Handles email delivery"
      },
      marks: 3
    },
    {
      type: "MATRIX",
      text: "Match network tools to their common use cases.",
      matrixRows: ["Ping", "Traceroute", "NSLookup"],
      matrixCols: ["Connectivity Test", "Path Discovery", "DNS Lookup"],
      correctAnswer: {
        Ping: ["Connectivity Test"],
        Traceroute: ["Path Discovery"],
        NSLookup: ["DNS Lookup"]
      },
      marks: 3
    },
    {
      type: "ASSERTION_REASON",
      text: "Select the correct relation for the given assertion and reason.",
      assertion: "Subnetting reduces broadcast traffic.",
      reason: "Smaller subnets limit broadcast domains.",
      options: [
        "A and R are true, R explains A",
        "A and R are true, R does not explain A",
        "A is true, R is false",
        "A is false, R is true"
      ],
      correctAnswer: "A and R are true, R explains A",
      marks: 2
    },
    {
      type: "PARAGRAPH_CASE",
      text: "Based on the paragraph, identify the best security control.",
      passage: "A company wants to restrict inbound traffic to only specific ports and block all others at the network boundary.",
      options: ["VPN", "Firewall", "Load balancer", "Proxy cache"],
      correctAnswer: "Firewall",
      marks: 2
    },
    {
      type: "SINGLE_MCQ",
      text: "If A can complete a task in 12 days and B in 18 days, together they complete it in:",
      options: ["6 days", "7.2 days", "8 days", "9 days"],
      correctAnswer: "7.2 days",
      marks: 1
    },
    {
      type: "NAT",
      text: "A shop gives a 10% discount on 800. What is the discounted price?",
      correctAnswer: 720,
      marks: 1
    }
  ];

  const existing = await Question.find({}, { type: 1, text: 1 }).lean();
  const existingKey = new Set(existing.map((q) => `${q.type}::${(q.text || "").trim().toLowerCase()}`));
  const prepared = samples
    .filter((q) => !existingKey.has(`${q.type}::${q.text.trim().toLowerCase()}`))
    .map((q) => ({
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      subject: q.subject || "General",
      topic: q.topic || "General",
      difficulty: q.difficulty || "Medium",
      ...q
    }));

  if (prepared.length === 0) return;
  await Question.insertMany(prepared);
}
