import React from "react";
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonPage,
  IonRow,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

const stats = [
  {
    title: "Web",
    subtitle: "Browser / PWA",
    content: "Deployed anywhere as static files.",
  },
  {
    title: "Android",
    subtitle: "Capacitor",
    content: "Same build synced into a native WebView shell.",
  },
  {
    title: "Desktop",
    subtitle: "Electron",
    content: "Windows, macOS and Linux from one source.",
  },
];

const DashboardPage: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Dashboard</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding">
      <IonGrid>
        <IonRow>
          {stats.map((stat) => (
            <IonCol size="12" sizeMd="6" sizeLg="4" key={stat.title}>
              <IonCard>
                <IonCardHeader>
                  <IonCardSubtitle>{stat.subtitle}</IonCardSubtitle>
                  <IonCardTitle>{stat.title}</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>{stat.content}</IonCardContent>
              </IonCard>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>
    </IonContent>
  </IonPage>
);

export default DashboardPage;
