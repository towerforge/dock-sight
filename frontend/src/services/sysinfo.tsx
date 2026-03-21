
import axios from 'axios';

export async function apiSysInfo(): Promise<any> {
	const res = await axios.get('/sysinfo');
	return res.data;
}

export async function apiDockerService(): Promise<any> {
  const res = await axios.get('/docker-service');
  return res.data;
}

export async function apiServiceContainers(name: string): Promise<any> {
  const res = await axios.get('/docker-service/containers', { params: { name } });
  return res.data;
}

export async function apiServiceImages(name: string): Promise<any> {
  const res = await axios.get('/docker-service/images', { params: { name } });
  return res.data;
}

export async function apiDeleteContainer(id: string): Promise<void> {
  await axios.delete('/docker-service/containers', { params: { id } });
}

export async function apiDeleteImage(id: string): Promise<void> {
  await axios.delete('/docker-service/images', { params: { id } });
}
