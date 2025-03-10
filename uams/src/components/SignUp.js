import { Link } from "react-router-dom";

const SignUp = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold mb-4">Sign Up Page</h2>
      <input
        type="text"
        placeholder="Username"
        className="border p-2 mb-2 w-64 rounded"
      />
      <input
        type="email"
        placeholder="Email"
        className="border p-2 mb-2 w-64 rounded"
      />
      <input
        type="password"
        placeholder="Password"
        className="border p-2 mb-2 w-64 rounded"
      />
      <button className="bg-blue-500 text-white px-4 py-2 rounded">Sign Up</button>
      <p className="mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-500 underline">
          Login here
        </Link>
      </p>
    </div>
  );
};

export default SignUp;
