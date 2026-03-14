
import axios from 'axios';

export async function apiSysInfo(): Promise<any> {
	const res = await axios.get('/sysinfo');
	return res.data;
}

export async function apiDockerService(): Promise<any> {
  const res = await axios.get('/docker-service');
  return res.data;
}
