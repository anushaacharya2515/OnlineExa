import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import QuestionBank from "./pages/QuestionBank";
import ModuleQuestionBank from "./pages/ModuleQuestionBank";
import AddQuestion from "./pages/AddQuestion";
import EditQuestion from "./pages/EditQuestion";
import AdminCreateExam from "./pages/AdminCreateExam";
import ManageModules from "./pages/ManageModules";
import AdminResults from "./pages/AdminResults";
import AdminStudents from "./pages/AdminStudents";
import AdminSettings from "./pages/AdminSettings";
import StudentExamsPage from "./pages/StudentExamsPage";
import ExamPage from "./pages/ExamPage";
import StudentExamGuidelines from "./pages/StudentExamGuidelines";
import StudentProfilePage from "./pages/StudentProfilePage";
import AIQuestionGenerator from "./pages/AIQuestionGenerator";

function ProtectedRoute({ role, children }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/question-bank" element={<ProtectedRoute role="admin"><QuestionBank /></ProtectedRoute>} />
      <Route path="/admin/question-bank/module/:moduleName" element={<ProtectedRoute role="admin"><ModuleQuestionBank /></ProtectedRoute>} />
      <Route path="/admin/question-bank/new" element={<ProtectedRoute role="admin"><AddQuestion /></ProtectedRoute>} />
      <Route path="/admin/question-bank/:id/edit" element={<ProtectedRoute role="admin"><EditQuestion /></ProtectedRoute>} />
      <Route path="/admin/ai-generator" element={<ProtectedRoute role="admin"><AIQuestionGenerator /></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute role="admin"><AdminCreateExam /></ProtectedRoute>} />
      <Route path="/admin/modules" element={<ProtectedRoute role="admin"><ManageModules /></ProtectedRoute>} />
      <Route path="/admin/results" element={<ProtectedRoute role="admin"><AdminResults /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute role="admin"><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute role="student"><Navigate to="/student/exams" replace /></ProtectedRoute>} />
      <Route path="/student/exams" element={<ProtectedRoute role="student"><StudentExamsPage /></ProtectedRoute>} />
      <Route path="/student/exams/:examId/guidelines" element={<ProtectedRoute role="student"><StudentExamGuidelines /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfilePage /></ProtectedRoute>} />
      <Route path="/student/results" element={<ProtectedRoute role="student"><Navigate to="/student/exams" replace /></ProtectedRoute>} />
      <Route path="/student/result/:attemptId" element={<ProtectedRoute role="student"><Navigate to="/student/exams" replace /></ProtectedRoute>} />
      <Route path="/student/question-bank" element={<ProtectedRoute role="student"><Navigate to="/student/exams" replace /></ProtectedRoute>} />
      <Route path="/exam/:attemptId" element={<ProtectedRoute role="student"><ExamPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={session ? `/${session.user.role}` : "/login"} replace />} />
    </Routes>
  );
}
