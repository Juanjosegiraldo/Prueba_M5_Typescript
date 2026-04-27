import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your CasaHub account and start listing properties.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
