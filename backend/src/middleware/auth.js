import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "exam-secret-key";

export function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: "12h"
  });
}

export function auth(requiredRole = null) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch {
      res.status(401).json({ message: "Invalid token" });
    }
  };
}
