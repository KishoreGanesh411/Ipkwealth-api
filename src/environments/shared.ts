// src/environments/shared.ts
export const sharedEnvironment = {
  baseTimeZone: 'Asia/Kolkata',
  port: 3333,

  // ...your other keys...

  corsOrigins: [
    'http://localhost:5173', // Vite dev
    'https://studio.apollographql.com', // Apollo Sandbox
  ],
  firebaseConfig: {
    apiKey: 'AIzaSyDSh9ccZviLr1VIfhVD261jyK9_0si0f4g',
    authDomain: 'ipkwealth-crm.firebaseapp.com',
    projectId: 'ipkwealth-crm',
    storageBucket: 'ipkwealth-crm.firebasestorage.app',
    messagingSenderId: '865119744232',
    appId: '1:865119744232:web:866da3f3b582b4f49a595d',
    measurementId: 'G-NES6XWW4YC',
  },
};
