// @/app/pages/staticRoutes.ts
import { route } from "rwsdk/router";
import ChangelogPage from "./changelog/ChangelogPage";
import AboutPage from "./about/AboutPage";
import TermsPage from "./legal/TermsPage";


export const staticRoutes = [
  route("/changelog", ChangelogPage),
  route("/about", AboutPage),
  route("/terms", TermsPage),
//   route("/privacy", PrivacyPage),
  // Add more as needed:
  // route("/faq", FaqPage),
  // route("/contact", ContactPage),
];