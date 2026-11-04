# **MARKET RESEARCH REPORT**

### **India-First Configurable Website Builder & Appointment Booking SaaS**

**Research date:** 4 November 2026  
**Primary market:** India  
**Secondary market:** Global  
**Product category:** Multi-tenant SaaS, visual website builder, booking and business management software.

---

## **1\. Executive Summary**

### **1.1 Product opportunity**

The proposed product combines three existing software categories:

1. Website builders and white-label website creation platforms.  
2. Appointment, time-slot and resource-booking software.  
3. Business management and SaaS administration platforms.

The objective is to create a reusable platform that allows an internal team to configure, generate and deploy fully functional, branded websites for small and medium-sized businesses within 1–2 days.

The main differentiation is the combination of:

* Metabase-inspired, grid-based visual website customization.  
* Reusable drag-and-drop widgets.  
* Industry-specific templates and configuration.  
* A generic booking engine supporting multiple inventory models.  
* Multi-tenant website management.  
* Integrated customer-facing booking, checkout and business administration.

### **1.2 Market observations**

The market already has strong individual solutions for website creation, scheduling and industry-specific operations.

Examples:

* Duda and GoHighLevel demonstrate agency-oriented white-label SaaS models.  
* Wix demonstrates the integration of website building and bookings.  
* Zoho Bookings and SimplyBook.me demonstrate configurable scheduling systems.  
* TurfBox demonstrates domain-specific turf operations.  
* Practo Ray and Eka demonstrate clinic management.  
* Mindbody and Zenoti demonstrate comprehensive fitness and wellness operations.  
* Playo demonstrates sports discovery and booking.

The opportunity is not to replicate each competitor.

It is to combine the most valuable capabilities into a single reusable platform with an efficient internal website-generation workflow.

### **1.3 Strategic recommendation**

Start with sports facilities, then expand into fitness and wellness.

Do not initially attempt to support every industry equally.

Build a generic booking engine but validate and optimise the first implementation against one concrete vertical.

---

## **2\. Indian Market Context**

### **2.1 Digital adoption among SMBs**

ICRIER's Annual Survey of MSMEs examines 2,365 enterprises across 12 states and more than 20 clusters.

The report identifies digitalisation and e-commerce integration as increasingly important contributors to enterprise development.

Source:  
[https\://icrier.org/publications/annual-survey-of-micro-small-and-medium-enterprises-msmes-in-india-the-role-of-digitalisation-in-enterprise-development/](https://icrier.org/publications/annual-survey-of-micro-small-and-medium-enterprises-msmes-in-india-the-role-of-digitalisation-in-enterprise-development/)

The Ministry of MSME's dashboard reported more than 10 crore registrations across Udyam and Udyam Assist Platform categories as of November 2026\.

This is not the addressable market for this product. The relevant segment is businesses that offer bookable services, resources or time-based inventory.

Source:  
[https\://dashboard.msme.gov.in/](https://dashboard.msme.gov.in/)

### **2.2 Digital payments**

Government-reported NPCI statistics for FY 2025–26:

* Approximately 24,162 crore annual UPI transactions.  
* Approximately ₹314 lakh crore in annual transaction value.  
* Approximately 30% year-on-year transaction-volume growth.

Source:  
[https\://www\.pib.gov.in/PressReleasePage.aspx?PRID=2257087](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2257087)

Implication:

Online payments should be a foundational part of the product architecture, even if a production payment gateway is introduced after the MVP.

### **2.3 Target industry segments**

| Segment | Examples | Booking model | Priority |
| ----- | ----- | ----- | ----- |
| Sports | Football turf, badminton, tennis, box cricket | Resource and duration-based | P0 |
| Fitness | Yoga, gym classes, personal training | Capacity and appointment-based | P1 |
| Beauty | Salons, spas | Staff and service-based | P1 |
| Healthcare | Clinics, doctors | Provider and appointment-based | P2 |
| Professional services | Consultants, tutors, coaches | Appointment-based | P2 |
| Rentals | Studios, event venues, equipment | Resource and duration-based | P2 |

### **2.4 Recommended first vertical**

Sports facilities are the best initial validation segment.

Reasons:

* Inventory is easy to understand.  
* Booking durations are configurable.  
* Multiple resources can be managed independently.  
* Pricing varies by time and day.  
* Booking conflicts have measurable financial consequences.  
* The customer booking journey is relatively straightforward.

A two-ground football turf is an excellent first reference implementation.

---

## **3\. Customer Problems and Unmet Needs**

| Customer problem | Current workaround | Proposed solution |
| ----- | ----- | ----- |
| No business website | Instagram and WhatsApp | Branded website |
| Manual booking | Phone calls and spreadsheets | Self-service booking |
| Double booking | Manual calendar checks | Transaction-safe booking engine |
| No live availability | Calls and messages | Real-time availability |
| Manual payment verification | UPI screenshots | Gateway verification |
| No-show bookings | Manual reminders | Deposits and cancellation policies |
| Staff scheduling | Individual calendars | Unified resource management |
| No performance visibility | Manual calculations | Analytics dashboard |
| Expensive customisation | Freelancers and agencies | Reusable visual builder |
| Marketplace dependency | Third-party booking portals | Direct booking infrastructure |

The product should sell measurable operational value rather than merely a website.

Core value proposition:

**More bookings, fewer conflicts, less administrative work, better payment collection and greater ownership of the customer relationship.**

### **3.1 WhatsApp considerations**

WhatsApp is an important existing customer communication channel.

Recommended capabilities:

* Booking links.  
* Booking confirmations.  
* Reminders.  
* Cancellation messages.  
* Rescheduling notifications.  
* Admin alerts.

A complete WhatsApp chatbot is not necessary for the MVP.

### **3.2 Payment considerations**

Implement:

* Server-side payment verification.  
* Payment transaction history.  
* Booking-to-payment reconciliation.  
* Refund status.  
* Failed and pending payment handling.  
* Duplicate-payment prevention.

---

## **4\. Competitor Analysis — India**

### **4.1 Industry-specific competitors**

#### **TurfBox**

Website: [https\://turfbox.in/](https://turfbox.in/)

Category: Turf management software.

Published pricing:

* Starter: ₹499/month or ₹4,999/year.  
* Pro: ₹7,999/year.  
* Enterprise: Custom.

Strengths:

* Visual booking calendar.  
* Overlap prevention.  
* Cross-midnight booking.  
* Staff accounts.  
* Revenue reports.  
* Partner profit management.  
* Cash handover tracking.  
* Expense tracking.

Learnings:

* Business-specific workflows matter.  
* Operational features can be more valuable than generic scheduling.  
* Revenue reconciliation should be considered in the booking platform.

#### **Practo Ray**

Website: [https\://www\.practo.com/providers/clinics/ray/plans](https://www.practo.com/providers/clinics/ray/plans)

Category: Clinic management.

Strengths:

* Doctor calendars.  
* Patient management.  
* Appointment scheduling.  
* Billing.  
* Reminders.  
* Reports.

Learnings:

* Provider-specific scheduling.  
* Patient history.  
* Role-based administration.

#### **Eka Care**

Website: [https\://eka.care/](https://eka.care/)

Category: Healthcare infrastructure.

Strengths:

* Clinic management.  
* Appointment management.  
* Digital prescriptions.  
* Patient engagement.  
* Reporting.  
* Digital presence.

Learnings:

* Website creation can be an acquisition channel for a broader operational SaaS product.

#### **Zenoti**

Website: [https\://www\.zenoti.com/](https://www.zenoti.com/)

Category: Salon, spa and wellness management.

Strengths:

* Appointments.  
* Employees.  
* POS.  
* Inventory.  
* Memberships.  
* Marketing.  
* Analytics.

Learnings:

* Build towards complete business operations rather than stopping at bookings.

#### **Playo**

Website: [https\://playo.co/](https://playo.co/)

Category: Sports discovery and booking marketplace.

Strengths:

* Venue discovery.  
* Sport selection.  
* Court selection.  
* Time-slot booking.  
* Payments.

Learnings:

* Customer-facing booking UX.  
* Resource and duration selection.

Strategic distinction:  
Our product should enable businesses to own branded booking websites instead of becoming another marketplace.

Other Indian products to investigate include Hudle, KheloMore, CricSlot and EasySalon.

---

## **5\. Competitor Analysis — Global**

### **5.1 Website builders and white-label platforms**

#### **Duda**

[https\://www\.duda.co/pricing](https://www.duda.co/pricing)

Published white-label pricing starts at approximately \$149/month with annual billing.

Strengths:

* White-label websites.  
* Client workspaces.  
* Custom branding.  
* Permissions.  
* Website previews.  
* Reusable templates.  
* API access.

Learnings:  
Build an agency-grade central administration platform.

#### **Wix**

[https\://www\.wix.com/](https://www.wix.com/)

Strengths:

* Visual website editing.  
* Booking integration.  
* Payments.  
* Memberships.  
* Multiple services.  
* Customer accounts.

Learnings:  
Booking functionality should be embedded naturally into website components.

#### **Webflow**

[https\://webflow.com/pricing](https://webflow.com/pricing)

Strengths:

* Visual design system.  
* Reusable components.  
* Responsive design.  
* CMS.  
* Client collaboration.

Learnings:  
Use design tokens, reusable components and breakpoint-specific editing.

#### **GoHighLevel**

[https\://www\.gohighlevel.com/pricing](https://www.gohighlevel.com/pricing)

Strengths:

* Sub-accounts.  
* CRM.  
* Booking calendars.  
* Websites.  
* Payment workflows.  
* SaaS provisioning.

Learnings:  
Automate client creation, account provisioning and recurring billing.

### **5.2 Scheduling and booking software**

#### **Zoho Bookings**

[https\://www\.zoho.com/bookings/](https://www.zoho.com/bookings/)

India pricing:

* Free.  
* Basic: ₹360/user/month annually.  
* Premium: ₹540/user/month annually.

Strengths:

* Workspaces.  
* Staff calendars.  
* Resources.  
* Service scheduling.

#### **SimplyBook.me**

[https\://simplybook.me/en/pricing](https://simplybook.me/en/pricing)

Published annual-billing prices:

* Free.  
* Basic: \$11.90/month.  
* Standard: \$24.90/month.  
* Premium: \$49.90/month.  
* Enterprise: Custom.

Strengths:

* Custom features.  
* Booking websites.  
* Resource scheduling.  
* Deposits.  
* Staff management.  
* Notifications.  
* Multi-location functionality.

#### **Fresha**

[https\://www\.fresha.com/pricing](https://www.fresha.com/pricing)

Published pricing:

* Independent: \$19.95/month.  
* Team: \$14.95/bookable team member/month.  
* Enterprise: Custom.

Strengths:

* Salon operations.  
* POS.  
* Appointments.  
* Memberships.  
* Packages.  
* Customer retention.  
* Marketplace acquisition.

#### **Mindbody**

[https\://www\.mindbodyonline.com/business/pricing](https://www.mindbodyonline.com/business/pricing)

Published starting price: \$79/month/location.

Strengths:

* Booking.  
* Payments.  
* Reporting.  
* Resource management.  
* Marketing.  
* AI front-desk capabilities.

#### **Acuity Scheduling**

[https\://acuityscheduling.com/](https://acuityscheduling.com/)

Strengths:

* Appointments.  
* Deposits.  
* Packages.  
* Memberships.  
* Multiple calendars.  
* Waitlists.

#### **Cal.com**

[https\://cal.com/pricing](https://cal.com/pricing)

Strengths:

* APIs.  
* Team scheduling.  
* Routing.  
* Permissions.  
* Flexible integrations.

---

## **6\. Competitor Best Practices and Opportunities**

| Competitor | Best practice to adopt | Our improvement opportunity |
| ----- | ----- | ----- |
| Duda | Agency workspace | Booking-specific website generation |
| Wix | Integrated booking widgets | More flexible resource configuration |
| Webflow | Component-based editing | Metabase-style grid placement |
| GoHighLevel | Automated sub-accounts | Industry templates and reusable booking |
| TurfBox | Turf-specific operations | Generalise across industries |
| Practo | Doctor calendars | Reusable provider scheduling |
| Zenoti | End-to-end operations | Modular cross-industry engine |
| Playo | Sports booking experience | Business-owned websites |
| Zoho | Workspaces and resources | Website and booking configuration |
| SimplyBook.me | Configurable features | Visual layout control |
| Fresha | Customer retention | Direct customer ownership |
| Mindbody | Business analytics | Industry-configurable dashboards |

### **6.1 Main differentiation opportunity**

The product should not compete on the availability of basic scheduling.

It should compete on:

1. Fast website delivery.  
2. Deep visual layout flexibility.  
3. Industry-specific configuration.  
4. Reusable booking infrastructure.  
5. Multi-client management.  
6. Business-owned customer experience.  
7. Integrated operational analytics.

---

## **7\. Metabase-Inspired Website Builder**

This is a key product differentiator.

The layout editor should allow users to:

* Create configurable grid layouts.  
* Add widgets.  
* Drag widgets between positions.  
* Resize horizontally and vertically.  
* Span multiple rows and columns.  
* Move entire rows.  
* Create nested sections.  
* Duplicate widgets.  
* Undo and redo.  
* Preview the website.  
* Configure responsive layouts.  
* Save reusable templates.

Recommended implementation:

* CSS Grid.  
* Twelve-column desktop layout.  
* Configurable grid gaps and row heights.  
* Widget positions stored in structured configuration.  
* Collision-aware placement.  
* Responsive breakpoint layouts.

The editor should be visual. Internal operators should not need to edit JSON.

The JSON configuration should only be the underlying storage and rendering mechanism.

---

## **8\. Value Creation Chain**

The product should support the entire SMB digital commerce lifecycle.

1. Client acquisition.  
2. Business requirement collection.  
3. Website generation.  
4. Customer acquisition.  
5. Service discovery.  
6. Booking conversion.  
7. Payment collection.  
8. Business operations.  
9. Customer retention.  
10. Analytics and optimisation.

Monetisation opportunities:

* Website setup fee.  
* Monthly subscription.  
* Hosting and maintenance.  
* Additional locations.  
* Advanced booking features.  
* WhatsApp/SMS usage.  
* Analytics.  
* AI-assisted customisation.  
* Custom integrations.

Recommended primary revenue model:

Setup fee \+ recurring SaaS subscription.

Avoid relying entirely on transaction commissions.

---

## **9\. Pricing and Costing**

### **9.1 Existing pricing benchmarks**

| Product | Indicative price |
| ----- | ----- |
| TurfBox Starter | ₹499/month |
| TurfBox Pro | ₹7,999/year |
| Zoho Bookings Basic | ₹360/user/month annually |
| SimplyBook.me Basic | \$11.90/month annually |
| SimplyBook.me Premium | \$49.90/month annually |
| Duda Agency | \$52/month annually |
| Duda White Label | \$149/month annually |
| Mindbody Starter | From \$79/month/location |
| Fresha Independent | \$19.95/month |

These prices are vendor-published benchmarks, not direct feature-equivalent comparisons.

### **9.2 Indian website development benchmarks**

A private 2026 market pricing report provides these indicative ranges:

| Website type | Cost |
| ----- | ----- |
| Landing page | ₹8,000–₹25,000 |
| Business website | ₹25,000–₹90,000 |
| Catalog/e-commerce | ₹50,000–₹2,50,000 |
| SaaS/custom application MVP | ₹1,50,000–₹6,00,000 |
| Monthly maintenance | ₹5,000–₹25,000 |

Source:  
[https\://nextscale.co.in/resources/research/india-website-pricing-report-2026](https://nextscale.co.in/resources/research/india-website-pricing-report-2026)

These are directional private-market estimates.

### **9.3 Proposed commercial pricing**

| Plan | Setup fee | Monthly subscription |
| ----- | ----- | ----- |
| Starter | ₹2,999–₹4,999 | ₹499–₹799 |
| Growth | ₹5,000–₹10,000 | ₹999–₹1,999 |
| Pro | ₹10,000–₹20,000 | ₹2,499–₹4,999 |
| Enterprise | Custom | Custom |

These prices should be validated with paying customers.

Potential add-ons:

* Custom domain.  
* Advanced website design.  
* Multiple locations.  
* WhatsApp notifications.  
* Advanced reporting.  
* AI-assisted customisation.

### **9.4 Operational cost drivers**

* Hosting.  
* Database.  
* Storage.  
* Image optimisation.  
* Payment gateway.  
* WhatsApp and SMS.  
* Domain and SSL.  
* Monitoring.  
* Customer support.

Initially use shared multi-tenant infrastructure to control costs.

Keep client data logically isolated.

Prefer client-direct payment gateway accounts during initial rollout.

---

## **10\. Market Sizing**

Do not use the entire MSME population as the addressable market.

Use:

SAM \= Number of relevant businesses × Annual revenue per customer.

Illustrative scenarios:

| Scenario | Eligible businesses | Monthly ARPA | Annual recurring opportunity |
| ----- | ----- | ----- | ----- |
| Conservative | 10,000 | ₹999 | ₹11.99 Cr |
| Base | 50,000 | ₹1,499 | ₹89.94 Cr |
| Upside | 100,000 | ₹1,999 | ₹239.88 Cr |

These are scenario calculations, not verified counts of eligible businesses.

Validate business counts using:

* Google Maps.  
* Industry directories.  
* Business associations.  
* Local facility listings.  
* Udyam data where relevant.  
* Primary interviews.

---

## **11\. Primary Research Programme**

The market research should be followed by primary research.

### **11.1 Customer interviews**

Target 38 businesses:

* 12 sports facilities.  
* 8 salons/spas.  
* 8 fitness businesses.  
* 6 clinics.  
* 4 other service businesses.

Research:

* Booking volumes.  
* Current booking process.  
* Double-booking frequency.  
* No-show rates.  
* Payment collection.  
* Software currently used.  
* Existing spending.  
* Desired website functionality.  
* Willingness to pay.  
* Importance of visual customisation.

Observe actual workflows rather than relying only on stated preferences.

### **11.2 Competitor usability tests**

Test:

* TurfBox.  
* Zoho Bookings.  
* SimplyBook.me.  
* Wix Bookings.  
* Duda.

Create accounts and execute identical booking and website-building tasks.

Measure:

* Setup time.  
* Booking configuration time.  
* Website customisation time.  
* Ease of use.  
* Feature gaps.  
* Mobile experience.  
* Administration effort.

### **11.3 Prototype validation**

Create a clickable Metabase-style editor prototype.

Ask non-technical users to:

* Add a booking widget.  
* Move it.  
* Resize it.  
* Configure its properties.  
* Preview the page.  
* Save the layout.

Measure time and error rate.

### **11.4 Initial go/no-go criteria**

* At least 8/12 sports operators identify recurring pain.  
* At least five operators agree to paid pilots.  
* No double bookings in defined concurrency testing.  
* Standard website deployment within two working days.  
* Demonstrable reduction in manual administration.

---

## **12\. Final Strategic Recommendations**

1. Start with sports facilities.  
2. Build a generic resource and appointment engine.  
3. Build a Metabase-inspired visual layout editor as a core P0 feature.  
4. Make industry templates configurable presets.  
5. Separate website presentation from booking logic.  
6. Implement multi-tenancy from the beginning.  
7. Support UPI and Indian payment workflows.  
8. Build WhatsApp notifications into the product roadmap.  
9. Use subscription plus setup fees.  
10. Validate willingness to pay before scaling.

### **Final Product Positioning**

An India-first, multi-tenant SaaS platform that enables internal teams and agencies to rapidly create, customise and deploy branded websites for appointment-based and resource-booking businesses, using a flexible visual website editor and reusable booking engine.

---

## **Sources and Further Reading**

* ICRIER MSME digitalisation survey: [https\://icrier.org/publications/annual-survey-of-micro-small-and-medium-enterprises-msmes-in-india-the-role-of-digitalisation-in-enterprise-development/](https://icrier.org/publications/annual-survey-of-micro-small-and-medium-enterprises-msmes-in-india-the-role-of-digitalisation-in-enterprise-development/)  
* MSME dashboard: [https\://dashboard.msme.gov.in/](https://dashboard.msme.gov.in/)  
* UPI statistics: [https\://www\.pib.gov.in/PressReleasePage.aspx?PRID=2257087](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2257087)  
* TurfBox: [https\://turfbox.in/](https://turfbox.in/)  
* Practo: [https\://www\.practo.com/providers/](https://www.practo.com/providers/)  
* Eka Care: [https\://eka.care/](https://eka.care/)  
* Zenoti: [https\://www\.zenoti.com/](https://www.zenoti.com/)  
* Playo: [https\://playo.co/](https://playo.co/)  
* Duda: [https\://www\.duda.co/](https://www.duda.co/)  
* Wix: [https\://www\.wix.com/](https://www.wix.com/)  
* Webflow: [https\://webflow.com/](https://webflow.com/)  
* GoHighLevel: [https\://www\.gohighlevel.com/](https://www.gohighlevel.com/)  
* Zoho Bookings: [https\://www\.zoho.com/bookings/](https://www.zoho.com/bookings/)  
* SimplyBook.me: [https\://simplybook.me/](https://simplybook.me/)  
* Fresha: [https\://www\.fresha.com/](https://www.fresha.com/)  
* Mindbody: [https\://www\.mindbodyonline.com/](https://www.mindbodyonline.com/)  
* Acuity: [https\://acuityscheduling.com/](https://acuityscheduling.com/)  
* Cal.com: [https\://cal.com/](https://cal.com/)  
* Razorpay: [https\://razorpay.com/pricing/](https://razorpay.com/pricing/)  
* India website pricing benchmark: [https\://nextscale.co.in/resources/research/india-website-pricing-report-2026](https://nextscale.co.in/resources/research/india-website-pricing-report-2026)

**Research qualification:** Competitor pricing and capabilities are based on published product information available at the research cut-off. Pricing can change. Qualitative product opportunities are strategic hypotheses and must be validated through hands-on product tests and customer research.

