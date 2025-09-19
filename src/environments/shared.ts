// src/environments/shared.ts
export const sharedEnvironment = {
  baseTimeZone: 'Asia/Kolkata',
  port: 3333,

  // ...your other keys...

  corsOrigins: [
    'http://localhost:5173', // Vite dev
    'https://studio.apollographql.com', // Apollo Sandbox
  ],
};
