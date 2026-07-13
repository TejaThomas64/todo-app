import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';
import './login.css';

function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [toast, setToast] = useState("");

    async function handlelogin(e) {
        e.preventDefault();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("Error logging in:", error);
            setToast(error.message || "Login failed");
            setTimeout(() => {
                setToast("");
            }, 1000);
            return;
        }

        console.log("Session:", data.session);
        setToast("Login Successful");

        setTimeout(() => {
            navigate("/todo");
        }, 800);


        console.log(data);

    }

    return (
        <div className="login-container">
            {toast && (
                <div className="toast">
                    {toast}
                </div>
            )}
            <div className="login-box">
                <h2>Login</h2>
                <form className="login-form" onSubmit={handlelogin}>
                    <input
                        type="email"
                        className="login-input"
                        placeholder="Enter a valid Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        className="login-input"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="login-button"

                    >
                        Log In
                    </button>
                </form>
                <div className="login-footer">
                    Don't have an account? <Link to="/signup">Sign Up</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;