/* if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(err => console.log("service worker not registered", err))
} */

export { default as PlanningController } from './planning/controller/planningController.js';
export { default as SpendingController } from './spending/controller/spendingController.js';
