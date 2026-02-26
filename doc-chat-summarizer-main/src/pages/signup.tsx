import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SignInProps {
  onSignIn: (session: string) => void;
}

const ADMIN_EMAIL = "admin@cginfinity.com";
const ADMIN_PASSWORD = "admin123";

const SignIn: React.FC<SignInProps> = ({ onSignIn }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please fill email and password");
      return;
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      alert("Invalid email or password");
      return;
    }

    const user = { name: "Admin", email: ADMIN_EMAIL };
    const session = JSON.stringify(user);

    onSignIn(session);

    navigate("/");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSignIn}
        className="bg-white p-8 rounded shadow-md w-full max-w-md"
      >
        {/* Logo + Title */}
        <div className="flex items-center gap-4">
            {/* LOGO */}
            <img
              src="/CG-Logo-Dark.png"
              alt="DocAI Logo"
              className="h-12 w-auto object-contain"
            />
            <span className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-xl font-bold m-4">DocAI</h1>
            </div>
          </div>

        <h2 className="text-xl font-semibold mb-4 text-center">Sign In</h2>

        <label className="block mb-2 text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          placeholder="admin@cginfinity.com"
        />

        <label className="block mb-2 text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 p-2 border rounded"
          placeholder="********"
        />

        <Button
          type="submit"
          className="w-full py-2  text-white rounded hover:bg-amber-600 transition"
        >
          Sign In
        </Button>
      </form>
    </div>
  );
};

export default SignIn;
