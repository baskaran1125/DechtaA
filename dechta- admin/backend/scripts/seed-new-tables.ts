import { db } from "../db";
import { drivers, workerSkills, workerDetails, walletTable, clients, jobs, supportTickets, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedNewTables() {
    console.log("🌱 Seeding new tables with demo data...");

    // Seed Drivers
    const driverData = [
        { name: "Rajesh Kumar", email: "rajesh.driver@example.com", phone: "+919876543210", vehicleType: "Truck", vehicleNumber: "TN01 AB 1234", licenseNumber: "DL1234567890", status: "active" },
        { name: "Amit Singh", email: "amit.driver@example.com", phone: "+919876543211", vehicleType: "Van", vehicleNumber: "TN02 CD 5678", licenseNumber: "DL0987654321", status: "active" },
        { name: "Suresh Verma", email: "suresh.driver@example.com", phone: "+919876543212", vehicleType: "Pickup", vehicleNumber: "TN03 EF 9012", licenseNumber: "DL1122334455", status: "inactive" }
    ];

    for (const data of driverData) {
        const existing = await db.select().from(drivers).where(eq(drivers.email, data.email));
        if (existing.length === 0) {
            await db.insert(drivers).values(data as any);
            console.log(`✓ Created driver: ${data.name}`);
        }
    }

    // Seed Manpower (worker_skills + worker_details)
    const manpowerData = [
        { fullName: "Ravi Sharma", phone: "+919876543220", skill: "Mason", experience: "5 years", state: "Tamil Nadu", city: "Chennai", area: "T Nagar" },
        { fullName: "Prakash Reddy", phone: "+919876543221", skill: "Carpenter", experience: "8 years", state: "Tamil Nadu", city: "Chennai", area: "Anna Nagar" },
        { fullName: "Vijay Kumar", phone: "+919876543222", skill: "Electrician", experience: "3 years", state: "Karnataka", city: "Bangalore", area: "Whitefield" },
        { fullName: "Mohan Das", phone: "+919876543223", skill: "Plumber", experience: "6 years", state: "Tamil Nadu", city: "Coimbatore", area: "RS Puram" }
    ];

    for (const data of manpowerData) {
        const existing = await db.select().from(workerSkills).where(eq(workerSkills.phone, data.phone));
        if (existing.length === 0) {
            const [worker] = await db.insert(workerSkills).values({
                fullName: data.fullName,
                phone: data.phone,
                state: data.state,
                city: data.city,
                area: data.area,
            }).returning();
            await db.insert(workerDetails).values({
                workerId: worker.id,
                skillName: data.skill,
                experience: data.experience,
            });
            await db.insert(walletTable).values({ workerId: worker.id }).onConflictDoNothing();
            console.log(`✓ Created worker: ${data.fullName}`);
        }
    }

    // Seed Clients
    const clientData = [
        { name: "Sundar Constructions", email: "sundar@constructions.com", phone: "+919876543230", company: "Sundar Pvt Ltd", area: "Chennai", address: "123 Main St, Chennai", serviceType: "Construction" },
        { name: "Lakshmi Builders", email: "lakshmi@builders.com", phone: "+919876543231", company: "Lakshmi Builders", area: "Bangalore", address: "456 MG Road, Bangalore", serviceType: "Renovation" },
        { name: "Tamil Nadu Housing Board", email: "tnhb@gov.in", phone: "+919876543232", company: "TN Housing Board", area: "Coimbatore", address: "789 State Office, Coimbatore", serviceType: "Government Project" }
    ];

    for (const data of clientData) {
        const existing = await db.select().from(clients).where(eq(clients.email, data.email));
        if (existing.length === 0) {
            await db.insert(clients).values(data as any);
            console.log(`✓ Created client: ${data.name}`);
        }
    }

    // Seed Jobs
    const clientsList = await db.select().from(clients);
    if (clientsList.length > 0) {
        const jobData = [
            { clientId: clientsList[0].id, title: "Building Construction", description: "5-story commercial building construction", jobType: "Construction", status: "in-progress", deadline: new Date('2026-06-30') },
            { clientId: clientsList[1].id, title: "Home Renovation", description: "Complete renovation of 3BHK apartment", jobType: "Renovation", status: "pending", deadline: new Date('2026-04-15') },
            { clientId: clientsList[2].id, title: "Housing Complex", description: "100-unit affordable housing project", jobType: "Construction", status: "in-progress", deadline: new Date('2026-12-31') }
        ];

        for (const data of jobData) {
            const existing = await db.select().from(jobs).where(eq(jobs.title, data.title));
            if (existing.length === 0) {
                await db.insert(jobs).values(data as any);
                console.log(`✓ Created job: ${data.title}`);
            }
        }
    }

    // Seed Support Tickets
    const usersList = await db.select().from(users);
    if (usersList.length > 0) {
        const ticketData = [
            { userId: usersList[0].id, subject: "Payment Issue", description: "Unable to process payment for order #123", status: "open", priority: "high" },
            { userId: usersList[0].id, subject: "Product Availability", description: "Need information about cement stock", status: "in-progress", priority: "medium" },
            { userId: usersList[0].id, subject: "Delivery Delay", description: "Order delivery is delayed by 3 days", status: "resolved", priority: "low" }
        ];

        for (const data of ticketData) {
            const existing = await db.select().from(supportTickets).where(eq(supportTickets.subject, data.subject));
            if (existing.length === 0) {
                await db.insert(supportTickets).values(data as any);
                console.log(`✓ Created support ticket: ${data.subject}`);
            }
        }
    }

    console.log("✅ New tables seeded successfully!");
}

seedNewTables()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error seeding new tables:", error);
        process.exit(1);
    });
