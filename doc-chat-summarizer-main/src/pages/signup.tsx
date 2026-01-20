import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SignUpProps {
  onSignUp: (session: string) => void;
}

const SignUp: React.FC<SignUpProps> = ({ onSignUp }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    const user = { name, email };
    const session = JSON.stringify(user);

    // Pass session to App so it updates state
    onSignUp(session);

    // Redirect to Index
    navigate("/");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSignUp}
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

        <h2 className="text-xl font-semibold mb-4 text-center">Sign Up</h2>

        <label className="block mb-2 text-sm font-medium">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          placeholder="Enter Your Name"
        />

        <label className="block mb-2 text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          placeholder="example@email.com"
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
          Sign Up
        </Button>
      </form>
    </div>
  );
};

export default SignUp;
