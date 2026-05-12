import { storage } from "../storage";
import { type InsertJob } from "../shared/schema";

export class JobService {
    async listAll(dateFilter?: { startDate?: Date; endDate?: Date }) {
        return await storage.getJobs(dateFilter);
    }

    async create(data: InsertJob) {
        return await storage.createJob(data);
    }

    async updateStatus(id: number, status: string) {
        return await storage.updateJobStatus(id, status);
    }

    async assignDriver(jobId: number, driverId: number) {
        return await storage.assignJobDriver(jobId, driverId);
    }

    async assignWorker(jobId: number, workerId: string) {
        return await storage.assignJobWorker(jobId, workerId);
    }
}

export const jobService = new JobService();
