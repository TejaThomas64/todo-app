import { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';
import './signup.css';

function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [toast, setToast] = useState("");

    async function handleSignup(e) {
        e.preventDefault();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            console.error("Error signing up:", error);
            setToast(error.message || "Signup failed");

            setTimeout(() => {
                setToast("");
            }, 3000);
            return;
        }

        console.log(data);
        setToast("Account created. Please verify your email before logging in.");

        setTimeout(() => {
            setToast("");
            navigate("/");
        }, 3000);
    }


    return (
        <div className="signup-container">
            {toast && (
                <div className="toast">
                    {toast}
                </div>
            )}
            <div className="signup-box">
                <h2>Sign Up</h2>
                <form className="signup-form" onSubmit={handleSignup}>
                    <input
                        type="email"
                        className="signup-input"
                        placeholder="Enter a valid Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        className="signup-input"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="signup-button">
                        Sign Up
                    </button>
                    <small className="helper-text">
                        You’ll need to verify your email before you can log in.
                    </small>
                </form>
                <div className="signup-footer">
                    Already have an account? <Link to="/">Log In</Link>
                </div>
            </div>

        </div>


    );
}

export default Signup;