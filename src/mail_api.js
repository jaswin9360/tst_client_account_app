import axios from "axios";

 const mail_api = axios.create({
  baseURL: "https://tst-server-91.onrender.com/api"
});

mail_api.interceptors.request.use((config) => {

  const token =
    localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization =
      `Bearer ${token}`;
  }

  return config;
});


export default mail_api;