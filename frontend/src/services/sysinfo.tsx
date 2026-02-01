
import axios from 'axios';

export const BASE_URL = 'http://0.0.0.0:8080';

export async function apiSysInfo(): Promise<any> {
	const res = await axios.get(`${BASE_URL}/sysinfo`);
	return res.data;
}

export async function apiDockerService(): Promise<any> {
  const res = await axios.get(`${BASE_URL}/docker-service`);
  return res.data;
}
