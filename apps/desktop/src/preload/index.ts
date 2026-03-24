import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("schenticad", {
  version: "0.1.0",
});
