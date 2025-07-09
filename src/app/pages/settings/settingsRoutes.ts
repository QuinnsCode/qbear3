import { route } from "rwsdk/router";
import SettingsPage from "./SettingsPage";
import IntegrationsPage from "./IntegrationsPage";


export const settingsRoutes = [
  route("/", IntegrationsPage),
  route("/integrations", IntegrationsPage),
];