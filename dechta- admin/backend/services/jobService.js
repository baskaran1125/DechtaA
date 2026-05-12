import { storage } from "../storage";
export class JobService {
    async listAll(dateFilter) {
        return await storage.getJobs(dateFilter);
    }
    async create(data) {
        return await storage.createJob(data);
    }
    async updateStatus(id, status) {
        return await storage.updateJobStatus(id, status);
    }
    async assignDriver(jobId, driverId) {
        return await storage.assignJobDriver(jobId, driverId);
    }
    async assignWorker(jobId, workerId) {
        return await storage.assignJobWorker(jobId, workerId);
    }
}
export const jobService = new JobService();
