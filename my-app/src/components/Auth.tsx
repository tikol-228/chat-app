import React, { useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import styles from "./Auth.module.css";
import img1 from "../assets/img1.jpg";
import img2 from "../assets/img2.jpg";

const Auth: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(formData.name, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    }
  };

  return (
    <div className={styles.authWrapper}>

      {/* SIGN IN */}
      <div className={`${styles.formSide} ${isRegister ? styles.formHideLeft : styles.formShow}`}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h1>Sign In</h1>
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit">Sign In</button>

          <p>
            Don’t have an account?{" "}
            <span onClick={() => setIsRegister(true)}>Sign up</span>
          </p>
        </form>
      </div>

      <div className={`${styles.imageSide} ${isRegister ? styles.imageMoveRight : styles.imageShow}`}>
        <img src={img1} />
      </div>

      <div className={`${styles.formSide} ${isRegister ? styles.formShow : styles.formHideRight}`}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h1>Sign Up</h1>
          <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
          <input type="text" name="username" placeholder="Username (e.g. @coolguy)" value={formData.username} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit">Sign Up</button>

          <p>
            Already have an account?{" "}
            <span onClick={() => setIsRegister(false)}>Sign in</span>
          </p>
        </form>
      </div>

      <div className={`${styles.imageSide} ${isRegister ? styles.imageShow : styles.imageMoveLeft}`}>
        <img src={img2} />
      </div>

    </div>
  );
};

export default Auth;