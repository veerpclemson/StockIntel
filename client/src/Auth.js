// Auth.js
import { useState } from "react";
import axios from "axios";

export default function Auth({ setUserId }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const signup = () => {
    axios.post("http://127.0.0.1:8000/signup", { email, password })
      .then(res => setMessage(res.data.message))
      .catch(err => setMessage(err.response?.data?.detail || "Signup error"));
  };

  const login = () => {
    axios.post("http://127.0.0.1:8000/login", { email, password })
      .then(res => {
        setMessage(res.data.message);
        setUserId(res.data.user_id);
      })
      .catch(err => setMessage(err.response?.data?.detail || "Login error"));
  };

  return (
    <div className="mb-6 p-4 border rounded bg-white">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="border p-2 rounded mr-2"/>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="border p-2 rounded mr-2"/>
      <button onClick={signup} className="bg-green-600 text-white px-4 rounded mr-2 hover:bg-green-700">Signup</button>
      <button onClick={login} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">Login</button>
      {message && <p className="mt-2 text-red-600">{message}</p>}
    </div>
  );
}
