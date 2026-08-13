import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="page" style={{ maxWidth: 420, paddingTop: 64 }}>
      <div className="card">
        <h1>🍽️ Cantine</h1>
        <p className="subtitle">Inscrivez-vous, jour après jour, en quelques secondes.</p>
        <LoginForm />
      </div>
    </div>
  );
}
