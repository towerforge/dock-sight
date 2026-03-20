
import axios from 'axios';

export async function apiSysInfo(): Promise<any> {
	const res = await axios.get('/sysinfo');
	return res.data;
}

export async function apiDockerService(): Promise<any> {
  const res = await axios.get('/docker-service');
  return res.data;
}

export async function apiServiceInfo(name: string): Promise<any> {
  const res = await axios.get('/docker-service/info', { params: { name } });
  return res.data;
}

export async function apiServiceImages(name: string): Promise<any> {
  const res = await axios.get('/docker-service/images', { params: { name } });
  return res.data;
}
