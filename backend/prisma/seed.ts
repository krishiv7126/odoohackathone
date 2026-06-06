import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.rfqVendor.deleteMany({});
  await prisma.rfqAttachment.deleteMany({});
  await prisma.rfqItem.deleteMany({});
  await prisma.rfq.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  console.log("Database cleaned.");

  console.log("Seeding started...");


  // 1. Seed Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: "System Administrator" },
  });

  const officerRole = await prisma.role.upsert({
    where: { name: "PROCUREMENT_OFFICER" },
    update: {},
    create: {
      name: "PROCUREMENT_OFFICER",
      description: "Procurement Officer",
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: {},
    create: {
      name: "MANAGER",
      description: "Approver / Purchasing Manager",
    },
  });

  const vendorRole = await prisma.role.upsert({
    where: { name: "VENDOR" },
    update: {},
    create: { name: "VENDOR", description: "Vendor Representative" },
  });

  console.log("Roles seeded.");

  // Hash passwords
  const passwordHash = await bcrypt.hash("password123", 10);

  // 2. Seed Users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@vendorbridge.com" },
    update: {},
    create: {
      email: "admin@vendorbridge.com",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      roleId: adminRole.id,
      isActive: true,
    },
  });

  const officerUser = await prisma.user.upsert({
    where: { email: "officer@vendorbridge.com" },
    update: {},
    create: {
      email: "officer@vendorbridge.com",
      passwordHash,
      firstName: "Rahul",
      lastName: "Sharma",
      roleId: officerRole.id,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "manager@vendorbridge.com" },
    update: {},
    create: {
      email: "manager@vendorbridge.com",
      passwordHash,
      firstName: "Priya",
      lastName: "Patel",
      roleId: managerRole.id,
      isActive: true,
    },
  });

  console.log("Base users seeded.");

  // 3. Seed 10 Vendors and link some to Vendor Users
  const vendorsData = [
    { name: "Tata Steel Ltd", reg: "TATA12345", tax: "27AAAAT1234F1Z1", email: "sales@tatasteel.com", phone: "+91-22-66658282" },
    { name: "Reliance Industries", reg: "RELI98765", tax: "24AAACR9876R2Z2", email: "procure@ril.com", phone: "+91-22-44770000" },
    { name: "Larsen & Toubro", reg: "LTCO88888", tax: "27AAACL8888L3Z3", email: "info@larsentoubro.com", phone: "+91-22-67523456" },
    { name: "Infosys Technologies", reg: "INFY55555", tax: "29AAACI5555I4Z4", email: "partners@infosys.com", phone: "+91-80-28520261" },
    { name: "Wipro Enterprises", reg: "WIPR44444", tax: "29AAACW4444W5Z5", email: "vendors@wipro.com", phone: "+91-80-28440011" },
    { name: "Godrej Group", reg: "GODR33333", tax: "27AAACG3333G6Z6", email: "support@godrej.com", phone: "+91-22-67965656" },
    { name: "Mahindra & Mahindra", reg: "MAHI22222", tax: "27AAACM2222M7Z7", email: "supply@mahindra.com", phone: "+91-22-24901441" },
    { name: "Adani Enterprises", reg: "ADAN11111", tax: "24AAACA1111A8Z8", email: "contact@adani.com", phone: "+91-79-26565555" },
    { name: "Hindalco Industries", reg: "HIND77777", tax: "27AAACH7777H9Z9", email: "sales@hindalco.adityabirla.com", phone: "+91-22-66626666" },
    { name: "Bharat Petroleum", reg: "BPCL66666", tax: "27AAACB6666B0Z0", email: "vendorsupport@bharatpetroleum.in", phone: "+91-22-22713000" },
  ];

  const seededVendors = [];

  for (let i = 0; i < vendorsData.length; i++) {
    const v = vendorsData[i];
    // Create a corresponding vendor login user for the first 3 vendors
    let vendorUserId = undefined;
    if (i < 3) {
      const email = `vendor${i + 1}@vendorbridge.com`;
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash,
          firstName: v.name.split(" ")[0],
          lastName: "Rep",
          roleId: vendorRole.id,
          isActive: true,
        },
      });
      vendorUserId = user.id;
    }

    const vendor = await prisma.vendor.upsert({
      where: { companyRegNo: v.reg },
      update: {},
      create: {
        name: v.name,
        companyRegNo: v.reg,
        taxId: v.tax,
        address: `${100 + i * 15}, Industrial Area, Sector 4, Mumbai, MH, India`,
        contactName: `${v.name.split(" ")[0]} Contact`,
        contactEmail: v.email,
        contactPhone: v.phone,
        userId: vendorUserId,
        status: "APPROVED",
      },
    });
    seededVendors.push(vendor);
  }

  console.log("10 Vendors seeded.");

  // 4. Seed 5 RFQs
  const rfqsData = [
    { number: "RFQ-2026-0001", title: "Structural Steel Supply", desc: "Procurement of high tensile structural steel beams and plates for project site A." },
    { number: "RFQ-2026-0002", title: "Industrial Cables & Wiring", desc: "Sourcing copper armored cabling and wiring accessories." },
    { number: "RFQ-2026-0003", title: "Office IT Equipment", desc: "Purchase of high-performance developer laptops and monitor screens." },
    { number: "RFQ-2026-0004", title: "Heavy Machinery Lubricants", desc: "Sourcing bulk hydraulic oil and greases for machinery maintenance." },
    { number: "RFQ-2026-0005", title: "Safety Gear & Accessories", desc: "Procurement of safety helmets, reflective jackets, and steel-toed boots." },
  ];

  const seededRfqs = [];
  const statusArray = ["SENT", "SENT", "CLOSED", "CLOSED", "DRAFT"];

  for (let i = 0; i < rfqsData.length; i++) {
    const r = rfqsData[i];
    const rfq = await prisma.rfq.upsert({
      where: { rfqNumber: r.number },
      update: {},
      create: {
        rfqNumber: r.number,
        title: r.title,
        description: r.desc,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days out
        status: statusArray[i],
        createdById: officerUser.id,
        rfqItems: {
          create: [
            { productName: `${r.title} Item A`, description: "Standard Grade Spec Sheet 1", quantity: 150.00, uom: "PCS", targetPrice: 2500.00 },
            { productName: `${r.title} Item B`, description: "Premium Grade Spec Sheet 2", quantity: 80.00, uom: "PCS", targetPrice: 5000.00 },
          ],
        },
      },
      include: { rfqItems: true },
    });
    seededRfqs.push(rfq);

    // Create attachments for non-draft RFQs
    if (statusArray[i] !== "DRAFT") {
      await prisma.rfqAttachment.create({
        data: {
          rfqId: rfq.id,
          fileName: `Specification_Sheet_${r.number}.pdf`,
          filePath: `/uploads/specs/Specification_Sheet_${r.number}.pdf`,
          uploadedBy: officerUser.id,
        },
      });
    }

    // Assign first 3 vendors to the first 4 RFQs
    if (statusArray[i] !== "DRAFT") {
      for (let j = 0; j < 3; j++) {
        await prisma.rfqVendor.upsert({
          where: {
            uq_rfq_vendor: {
              rfqId: rfq.id,
              vendorId: seededVendors[j].id,
            },
          },
          update: {
            status: j === 0 ? "SUBMITTED" : "PENDING",
          },
          create: {
            rfqId: rfq.id,
            vendorId: seededVendors[j].id,
            status: j === 0 ? "SUBMITTED" : "PENDING",
          },
        });
      }
    }
  }

  console.log("5 RFQs seeded (with items and attachments).");

  // 5. Seed 10 Quotations (for RFQ 1, 2, 3 submitted by different vendors)
  // Let's generate quotations for RFQ-2026-0001 (RFQ 1), RFQ-2026-0002 (RFQ 2), RFQ-2026-0003 (RFQ 3)
  const seededQuotations = [];
  const taxRates = [0.18, 0.18, 0.12]; // GST rates

  let quoteCount = 1;
  for (let rfqIdx = 0; rfqIdx < 3; rfqIdx++) {
    const rfq = seededRfqs[rfqIdx];
    // Create quotes from the first 3 vendors
    for (let vIdx = 0; vIdx < 3; vIdx++) {
      const vendor = seededVendors[vIdx];
      const rfqItems = rfq.rfqItems;

      const itemsPrice = rfqItems.map((item) => {
        const targetPriceVal = Number(item.targetPrice || 1000);
        // Vary price: vendor 1 is target, vendor 2 is cheaper, vendor 3 is expensive
        const unitPrice = vIdx === 0 
          ? targetPriceVal 
          : vIdx === 1 
            ? targetPriceVal * 0.9 
            : targetPriceVal * 1.1;
        const totalPrice = unitPrice * Number(item.quantity);
        return { item, unitPrice, totalPrice };
      });

      const subtotal = itemsPrice.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Calculate GST (18% for metals/cables, 12% for IT)
      // CGST = SGST = 9% each (or IGST = 18% if inter-state)
      // Let's assume CGST and SGST apply (intra-state) for simplicity
      const gstRate = taxRates[rfqIdx];
      const cgst = subtotal * (gstRate / 2);
      const sgst = subtotal * (gstRate / 2);
      const igst = 0;
      const grandTotal = subtotal + cgst + sgst;

      // First quotation will be approved
      const quoteStatus = (rfqIdx === 0 && vIdx === 1) ? "APPROVED" : (rfqIdx === 0 ? "REJECTED" : "SUBMITTED");

      const quotation = await prisma.quotation.create({
        data: {
          rfqId: rfq.id,
          vendorId: vendor.id,
          quotationNumber: `QT-2026-000${quoteCount++}`,
          status: quoteStatus,
          subtotal,
          cgst,
          sgst,
          igst,
          grandTotal,
          validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days validity
          notes: `Quotation from ${vendor.name} with premium logistics included.`,
          quotationItems: {
            create: itemsPrice.map((ip) => ({
              rfqItemId: ip.item.id,
              unitPrice: ip.unitPrice,
              totalPrice: ip.totalPrice,
              leadTimeDays: 7 + vIdx * 2,
              notes: "Compliant with specification Sheet 1",
            })),
          },
        },
      });
      seededQuotations.push(quotation);
    }
  }

  // Add one extra quotation to make 10 quotations total
  const extraQuotation = await prisma.quotation.create({
    data: {
      rfqId: seededRfqs[3].id,
      vendorId: seededVendors[0].id,
      quotationNumber: `QT-2026-0010`,
      status: "SUBMITTED",
      subtotal: 45000.00,
      cgst: 4050.00,
      sgst: 4050.00,
      igst: 0,
      grandTotal: 53100.00,
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: "Initial quote.",
      quotationItems: {
        create: [
          { rfqItemId: seededRfqs[3].rfqItems[0].id, unitPrice: 2200.00, totalPrice: 330000.00, leadTimeDays: 10 },
        ]
      }
    }
  });
  seededQuotations.push(extraQuotation);

  console.log("10 Quotations seeded (with GST details).");

  // 6. Seed 2 Purchase Orders
  // PO 1 from approved quotation 2 (RFQ 1, Vendor 2)
  const approvedQuote = seededQuotations.find(q => q.status === "APPROVED");
  if (approvedQuote) {
    const po1 = await prisma.purchaseOrder.create({
      data: {
        poNumber: "PO-2026-0001",
        quotationId: approvedQuote.id,
        vendorId: approvedQuote.vendorId,
        status: "SENT",
        subtotal: approvedQuote.subtotal,
        cgst: approvedQuote.cgst,
        sgst: approvedQuote.sgst,
        igst: approvedQuote.igst,
        grandTotal: approvedQuote.grandTotal,
        deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        terms: "Payment within 30 days of delivery. Logistics covered by vendor.",
        createdById: officerUser.id,
        poItems: {
          create: [
            { productName: "Structural Steel Supply Item A", description: "Standard Grade", quantity: 150.00, unitPrice: 2250.00, totalPrice: 337500.00, uom: "PCS" },
            { productName: "Structural Steel Supply Item B", description: "Premium Grade", quantity: 80.00, unitPrice: 4500.00, totalPrice: 360000.00, uom: "PCS" },
          ],
        },
      },
    });

    // Create approval record
    await prisma.approval.create({
      data: {
        purchaseOrderId: po1.id,
        approverId: managerUser.id,
        status: "APPROVED",
        comments: "Pricing is optimal and matches budget allocation. Approved.",
      },
    });

    // Seed 2 Invoices (associated with PO 1)
    // Invoice 1: PAID state
    const invoice1 = await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-0001",
        purchaseOrderId: po1.id,
        vendorId: po1.vendorId,
        status: "PAID",
        subtotal: po1.subtotal,
        cgst: po1.cgst,
        sgst: po1.sgst,
        igst: po1.igst,
        grandTotal: po1.grandTotal,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        pdfUrl: "/uploads/invoices/INV-2026-0001.pdf",
        invoiceItems: {
          create: [
            { productName: "Structural Steel Supply Item A", quantity: 150.00, unitPrice: 2250.00, totalPrice: 337500.00, uom: "PCS" },
            { productName: "Structural Steel Supply Item B", quantity: 80.00, unitPrice: 4500.00, totalPrice: 360000.00, uom: "PCS" },
          ],
        },
      },
    });

    // Invoice 2: SENT state
    await prisma.invoice.create({
      data: {
        invoiceNumber: "INV-2026-0002",
        purchaseOrderId: po1.id,
        vendorId: po1.vendorId,
        status: "SENT",
        subtotal: po1.subtotal,
        cgst: po1.cgst,
        sgst: po1.sgst,
        igst: po1.igst,
        grandTotal: po1.grandTotal,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        pdfUrl: null,
        invoiceItems: {
          create: [
            { productName: "Structural Steel Supply Item A", quantity: 150.00, unitPrice: 2250.00, totalPrice: 337500.00, uom: "PCS" },
            { productName: "Structural Steel Supply Item B", quantity: 80.00, unitPrice: 4500.00, totalPrice: 360000.00, uom: "PCS" },
          ],
        },
      },
    });

    console.log("2 Purchase Orders and 2 Invoices seeded.");
  }

  // Create a second PO in DRAFT state
  const approvedQuote2 = seededQuotations[3]; // Some quotation
  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-0002",
      quotationId: approvedQuote2.id,
      vendorId: approvedQuote2.vendorId,
      status: "DRAFT",
      subtotal: 50000.00,
      cgst: 4500.00,
      sgst: 4500.00,
      igst: 0.00,
      grandTotal: 59000.00,
      deliveryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      terms: "Immediate delivery, Net 15.",
      createdById: officerUser.id,
      poItems: {
        create: [
          { productName: "IT Equipment", description: "Laptops", quantity: 5.00, unitPrice: 10000.00, totalPrice: 50000.00, uom: "PCS" },
        ],
      },
    },
  });

  // 7. Seed activity logs
  const activities = [
    { action: "USER_LOGIN", type: "USER", id: adminUser.id, details: "Admin logged in successfully from IP 127.0.0.1" },
    { action: "VENDOR_CREATED", type: "VENDOR", id: seededVendors[0].id, details: "Vendor Tata Steel Ltd profile created" },
    { action: "RFQ_CREATED", type: "RFQ", id: seededRfqs[0].id, details: "RFQ-2026-0001 created by Rahul Sharma" },
    { action: "RFQ_SENT", type: "RFQ", id: seededRfqs[0].id, details: "RFQ-2026-0001 broadcasted to 3 vendors" },
    { action: "QUOTATION_SUBMITTED", type: "QUOTATION", id: seededQuotations[0].id, details: "Quotation QT-2026-0001 submitted by Tata Steel" },
    { action: "QUOTATION_APPROVED", type: "QUOTATION", id: approvedQuote ? approvedQuote.id : "none", details: "Quotation approved by Priya Patel" },
    { action: "PO_GENERATED", type: "PO", id: "PO-2026-0001", details: "PO-2026-0001 generated for Reliance Industries" },
    { action: "INVOICE_GENERATED", type: "INVOICE", id: "INV-2026-0001", details: "Invoice INV-2026-0001 submitted by vendor" },
    { action: "INVOICE_EMAILED", type: "INVOICE", id: "INV-2026-0001", details: "Invoice INV-2026-0001 PDF emailed to accounts@vendorbridge.com" },
  ];

  for (const act of activities) {
    await prisma.activityLog.create({
      data: {
        userId: officerUser.id,
        action: act.action,
        entityType: act.type,
        entityId: act.id,
        ipAddress: "127.0.0.1",
        details: act.details,
      },
    });
  }

  console.log("Activity logs seeded.");
  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
