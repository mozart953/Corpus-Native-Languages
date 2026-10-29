import HomeComponent from "@/components/Home/Home.jsx";

/**
 * The navbar is rendered inside HomeComponent because the two share the
 * signed-in state: the sign-in dialog has to be able to swap the navbar
 * between its logged-out and logged-in shapes.
 */
export default function Home() {
  return <HomeComponent />;
}
