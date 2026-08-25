import React from "react";
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/react";

const SettingsPage: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Settings</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <IonList inset>
        <IonListHeader>
          <IonLabel>Preferences</IonLabel>
        </IonListHeader>
        <IonItem>
          <IonToggle checked>Notifications</IonToggle>
        </IonItem>
        <IonItem>
          <IonToggle>Haptics</IonToggle>
        </IonItem>
        <IonItem lines="none">
          <IonLabel>Built with @involvex/ionic-everywhere</IonLabel>
          <IonNote slot="end">v0.1.0</IonNote>
        </IonItem>
      </IonList>
    </IonContent>
  </IonPage>
);

export default SettingsPage;
