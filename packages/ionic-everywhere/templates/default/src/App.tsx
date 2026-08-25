import React from "react";
import { Navigate, Route } from "react-router-dom";
import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonApp,
  IonSplitPane,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import {
  listOutline,
  settingsOutline,
  speedometerOutline,
} from "ionicons/icons";
import AppMenu from "./components/AppMenu";
import DashboardPage from "./pages/DashboardPage";
import ListPage from "./pages/ListPage";
import SettingsPage from "./pages/SettingsPage";

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonSplitPane contentId="main-content">
        <AppMenu />
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/list" element={<ListPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon aria-hidden="true" icon={speedometerOutline} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>
            <IonTabButton tab="list" href="/list">
              <IonIcon aria-hidden="true" icon={listOutline} />
              <IonLabel>List</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon aria-hidden="true" icon={settingsOutline} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonSplitPane>
    </IonReactRouter>
  </IonApp>
);

export default App;
