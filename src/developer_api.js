import axios from "axios";

const developer_api = axios.create({
  baseURL: "https://tst-server-90.onrender.com/api"
});

developer_api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem("developerToken") ||
      localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);

export default developer_api;