# **PRODUCT REQUIREMENTS DOCUMENT (PRD)**

## **Configurable Website Builder & Booking Management SaaS**

**Version:** 2.0  
**Status:** Product definition and MVP specification  
**Primary market:** India  
**Future market:** Global  
**Target delivery capability:** 1–2 days per standard client website

---

## **1\. Product Vision**

Build a multi-tenant SaaS platform that enables an internal team or agency to rapidly create, configure, customise, publish and manage fully functional websites for appointment-based and resource-booking businesses.

The platform should combine:

1. A visual, grid-based website builder.  
2. A reusable booking and inventory management engine.  
3. Industry-specific website and booking configurations.  
4. Business administration and analytics.  
5. Centralised multi-client SaaS management.

The core differentiator is the combination of a Metabase-inspired layout editor with a reusable, industry-independent booking engine.

The product should enable a standard client website to be configured and deployed within 1–2 days.

---

## **2\. Target Customers and User Personas**

### **2.1 Internal platform administrator**

Responsible for:

* Creating client accounts.  
* Managing tenants.  
* Managing templates.  
* Managing component libraries.  
* Managing platform-level settings.  
* Monitoring deployments.  
* Managing subscription plans.  
* Managing platform users and permissions.

### **2.2 Website configurator**

Responsible for:

* Collecting client requirements.  
* Selecting industry templates.  
* Customising website layouts.  
* Configuring widgets.  
* Uploading images.  
* Configuring booking settings.  
* Previewing and publishing websites.

This user should not require coding knowledge.

### **2.3 Business owner**

Responsible for:

* Managing business details.  
* Managing resources.  
* Managing staff.  
* Managing availability.  
* Managing bookings.  
* Managing prices.  
* Reviewing analytics.  
* Managing customers.

### **2.4 Business employee**

Responsible for:

* Viewing assigned bookings.  
* Managing schedules.  
* Confirming appointments.  
* Managing cancellations.  
* Updating booking statuses.

### **2.5 End customer**

Responsible for:

* Browsing the website.  
* Discovering services.  
* Selecting resources.  
* Viewing availability.  
* Booking time slots.  
* Making payments.  
* Managing bookings.

---

## **3\. Core System Architecture**

The platform must contain three logically independent layers.

### **3.1 Website Builder**

Responsibilities:

* Page creation.  
* Grid layout management.  
* Widget library.  
* Component properties.  
* Themes.  
* Branding.  
* Responsive layouts.  
* Content management.  
* Preview and publishing.

### **3.2 Booking and Business Engine**

Responsibilities:

* Service management.  
* Resource management.  
* Availability.  
* Booking rules.  
* Slot generation.  
* Inventory locking.  
* Payments.  
* Cancellations.  
* Rescheduling.  
* Notifications.  
* Business analytics.

### **3.3 SaaS Management Platform**

Responsibilities:

* Multi-tenancy.  
* Client accounts.  
* User management.  
* Role-based permissions.  
* Industry templates.  
* Client provisioning.  
* Domain management.  
* Subscription management.  
* Deployment management.  
* Platform analytics.

These modules should interact through well-defined APIs and shared domain contracts.

The website renderer must not contain the core booking business logic.

---

## **4\. Multi-Tenant Architecture**

The platform must support multiple businesses on shared infrastructure.

Each tenant must have:

* Independent website configuration.  
* Independent branding.  
* Independent domain.  
* Independent users.  
* Independent services.  
* Independent inventory.  
* Independent schedules.  
* Independent bookings.  
* Independent customer records.  
* Independent analytics.  
* Independent business settings.

Implement tenant isolation using explicit tenant identifiers and database-level security controls.

Every tenant-owned data operation must be authorised against the active tenant.

Internal administrators should have controlled access across tenants.

The platform should support:

* Tenant creation.  
* Tenant activation.  
* Tenant suspension.  
* Tenant configuration.  
* Tenant deletion and data-retention policies.  
* Tenant-level feature entitlements.  
* Tenant-level usage tracking.

---

## **5\. Website Builder — P0 Core Module**

This is one of the most important components of the product.

The website builder must offer a highly flexible visual layout experience inspired by Metabase dashboard editing.

### **5.1 Grid-based layout system**

Use a configurable grid-based layout.

Recommended default:

* Twelve-column desktop grid.  
* Configurable rows.  
* Configurable column spans.  
* Configurable row spans.  
* Configurable gaps.  
* Responsive breakpoints.

The user must be able to visually configure where individual widgets appear.

### **5.2 Drag-and-drop functionality**

Support:

* Dragging widgets between grid positions.  
* Resizing widgets.  
* Expanding widgets across multiple columns.  
* Expanding widgets across multiple rows.  
* Moving entire rows.  
* Reordering sections.  
* Creating nested sections.  
* Duplicating widgets.  
* Removing widgets.  
* Adding new widgets.  
* Undo and redo.  
* Saving layouts.  
* Reusing layouts.

When widgets are moved or resized, the grid should respond intelligently.

Avoid overlapping elements and unintended layout breakage.

### **5.3 Widget placement flexibility**

Examples:

* A hero banner occupying the entire first row.  
* A booking calendar occupying six columns.  
* Available time slots occupying the other six columns.  
* A gallery occupying the entire width.  
* Reviews and contact information displayed side by side.  
* A pricing widget spanning multiple rows.

The same component must be usable in different layouts.

Do not hardcode page layouts to industry templates.

Templates should be starting configurations, not layout restrictions.

### **5.4 Responsive layout management**

Support independent layout configuration for:

* Desktop.  
* Tablet.  
* Mobile.

Allow the editor to display each breakpoint.

Support:

* Widget reordering.  
* Column-span adjustments.  
* Visibility controls.  
* Mobile-specific spacing.  
* Responsive image behaviour.

The published website must be responsive even if only desktop layout is initially configured.

### **5.5 Widget library**

Build a reusable library containing:

#### **General widgets**

* Header.  
* Navigation.  
* Hero banner.  
* Text.  
* Image.  
* Video.  
* Image gallery.  
* Testimonials.  
* Reviews.  
* Pricing.  
* Contact form.  
* Location map.  
* FAQ.  
* Footer.  
* Social links.

#### **Booking widgets**

* Booking calendar.  
* Date selector.  
* Time-slot selector.  
* Resource selector.  
* Service selector.  
* Employee selector.  
* Doctor selector.  
* Class selector.  
* Availability display.  
* Booking summary.  
* Checkout.  
* Customer login.  
* Customer booking history.

#### **Business widgets**

* Business profile.  
* Operating hours.  
* Service catalog.  
* Product catalog.  
* Memberships.  
* Promotions.  
* Offers.  
* Statistics.  
* Location information.

Each widget must expose configurable properties.

### **5.6 Widget properties**

Properties should include:

* Visibility.  
* Content.  
* Title.  
* Description.  
* Dimensions.  
* Grid placement.  
* Alignment.  
* Spacing.  
* Background.  
* Colours.  
* Typography.  
* Images.  
* Borders.  
* Responsive behaviour.  
* Data source.  
* Business configuration.  
* Widget-specific settings.

### **5.7 Layout persistence**

Store the layout as structured, versioned configuration.

Example:

{  
"pageId": "home",  
"version": 1,  
"layout": {  
"columns": 12,  
"widgets": \[  
{  
"id": "hero-01",  
"type": "hero",  
"position": {  
"column": 1,  
"row": 1,  
"columnSpan": 12,  
"rowSpan": 2  
}  
},  
{  
"id": "booking-01",  
"type": "booking-calendar",  
"position": {  
"column": 1,  
"row": 3,  
"columnSpan": 6,  
"rowSpan": 3  
}  
}  
\]  
}  
}

The frontend renderer should interpret this configuration and generate the published website.

The user must never need to edit this configuration manually.

### **5.8 Layout management features**

Include:

* Save draft.  
* Publish.  
* Revert to previous version.  
* Duplicate page.  
* Duplicate template.  
* Save as reusable template.  
* Preview.  
* Version history.  
* Unsaved-change warning.

---

## **6\. Industry Templates**

Templates should be configurable presets built from reusable widgets and business settings.

### **6.1 Sports facility template**

Initial reference use case: football turf.

Configuration:

* Facility name.  
* Number of grounds.  
* Ground descriptions.  
* Images.  
* Operating hours.  
* Booking duration.  
* Minimum duration.  
* Maximum duration.  
* Slot interval.  
* Peak pricing.  
* Off-peak pricing.  
* Weekday pricing.  
* Weekend pricing.  
* Cancellation policy.

Widgets:

* Hero.  
* Facility gallery.  
* Ground selector.  
* Booking calendar.  
* Time-slot selector.  
* Pricing.  
* Checkout.  
* Reviews.  
* Contact information.

### **6.2 Clinic template**

Configuration:

* Doctors.  
* Specialisations.  
* Appointment duration.  
* Consultation fee.  
* Doctor availability.  
* Holidays.  
* Appointment policies.

Widgets:

* Doctor profiles.  
* Doctor selector.  
* Appointment calendar.  
* Available slots.  
* Consultation information.  
* Patient details.

Healthcare-specific privacy and regulatory requirements must be assessed before storing patient records.

### **6.3 Fitness template**

Configuration:

* Classes.  
* Trainers.  
* Class schedules.  
* Capacity.  
* Memberships.  
* Packages.  
* Pricing.

Widgets:

* Class listings.  
* Trainer profiles.  
* Schedule.  
* Capacity indicator.  
* Membership pricing.  
* Booking.

### **6.4 Salon template**

Configuration:

* Services.  
* Employees.  
* Service duration.  
* Employee availability.  
* Pricing.  
* Buffer periods.

Widgets:

* Service catalog.  
* Employee profiles.  
* Appointment calendar.  
* Available slots.  
* Checkout.

---

## **7\. Booking Engine — P0 Core Module**

The booking engine must be industry-independent.

Support three booking models.

### **7.1 Exclusive resource booking**

Examples:

* Football turf.  
* Tennis court.  
* Badminton court.  
* Studio rental.

Rules:

* One resource cannot have overlapping confirmed bookings.  
* Booking duration can be configurable.  
* Availability is calculated for the entire requested interval.  
* Multiple resources can be selected independently.

### **7.2 Staff/service appointment booking**

Examples:

* Doctor.  
* Salon employee.  
* Personal trainer.  
* Consultant.

Rules:

* Each provider has independent availability.  
* Service duration can vary.  
* Buffer periods can be configured.  
* Provider and service compatibility must be validated.  
* Multiple calendars can be supported.

### **7.3 Capacity-based booking**

Examples:

* Yoga class.  
* Group fitness.  
* Workshops.

Rules:

* Each session has a capacity.  
* Multiple customers can book.  
* Confirmed reservations cannot exceed capacity.  
* Capacity must be reserved atomically.

### **7.4 Availability configuration**

Support:

* Business hours.  
* Working days.  
* Holidays.  
* Special operating hours.  
* Recurring schedules.  
* Resource-specific schedules.  
* Provider-specific schedules.  
* Service durations.  
* Slot intervals.  
* Buffer periods.  
* Advance booking limits.  
* Minimum notice.  
* Maximum notice.  
* Time zones.  
* Cross-midnight availability.

### **7.5 Pricing configuration**

Support:

* Fixed pricing.  
* Per-hour pricing.  
* Per-session pricing.  
* Peak pricing.  
* Off-peak pricing.  
* Weekday pricing.  
* Weekend pricing.  
* Duration-based pricing.  
* Discounts.  
* Coupons.  
* Tax configuration.  
* Advance deposits.

### **7.6 Booking lifecycle**

1. Customer selects a service.  
2. Customer selects a resource/provider where applicable.  
3. Customer selects a date.  
4. System displays availability.  
5. Customer selects a slot.  
6. Backend revalidates availability.  
7. Temporary hold is created if required.  
8. Customer enters details.  
9. Customer proceeds to checkout.  
10. Payment is initiated if required.  
11. Payment is verified server-side.  
12. Booking is confirmed.  
13. Confirmation is sent.  
14. Business dashboard is updated.

### **7.7 Booking statuses**

Support:

* Available.  
* Held.  
* Pending payment.  
* Confirmed.  
* Cancelled.  
* Expired.  
* Completed.  
* No-show.  
* Refund pending.  
* Refunded.

Maintain an audit trail of booking status transitions.

---

## **8\. Concurrency and Booking Integrity**

This is a critical production requirement.

The system must prevent multiple customers from reserving the same exclusive inventory simultaneously.

Example:

Twenty customers attempt to book the same football turf for 8 PM.

The system must not create twenty confirmed bookings.

Implement:

* Database transactions.  
* Row-level locks or atomic conditional updates.  
* Unique constraints.  
* Temporary booking holds.  
* Hold expiration.  
* Idempotency keys.  
* Server-side availability validation.  
* Payment webhook verification.  
* Duplicate-request protection.

For capacity-based inventory, reservations must be atomically checked against remaining capacity.

### **8.1 Payment failure scenarios**

Handle:

* Payment failure.  
* Payment timeout.  
* Payment success with delayed webhook.  
* Payment success after hold expiration.  
* Duplicate payment request.  
* Booking creation failure after payment.  
* Network disconnection.  
* Customer abandoning checkout.

If payment succeeds but the booking cannot be confirmed, initiate a defined recovery and refund workflow.

Never leave customers charged without a traceable booking or recovery status.

---

## **9\. Payment Integration**

The MVP should support a simulated or sandbox payment flow.

Design for future production integrations.

Potential gateways:

* Razorpay.  
* Cashfree.  
* Stripe where appropriate.

Support:

* UPI.  
* Cards.  
* Net banking.  
* Other gateway-supported methods.

Implement:

* Checkout summary.  
* Taxes.  
* Discounts.  
* Deposits.  
* Full payment.  
* Pending payments.  
* Failed payments.  
* Refund status.  
* Payment reconciliation.

Initially, prefer direct client merchant accounts.

Do not unnecessarily hold client funds centrally.

---

## **10\. Authentication and User Management**

### **10.1 Customer authentication**

* Registration.  
* Login.  
* Email/mobile verification.  
* Password reset.  
* Customer profile.  
* Booking history.  
* Cancellation and rescheduling.

Allow configurable guest booking where appropriate.

### **10.2 Business authentication**

* Owner login.  
* Employee login.  
* Staff roles.  
* Resource permissions.  
* Booking access.  
* Schedule management.

### **10.3 Internal administration**

* Platform administrator.  
* Website configurator.  
* Client manager.  
* Deployment permissions.

Use role-based access control.

### **10.4 Security**

Implement:

* Secure sessions.  
* Tenant-level access checks.  
* Server-side validation.  
* Rate limiting.  
* Audit logs.  
* Secure secrets management.  
* Protection against common web vulnerabilities.  
* Appropriate data retention.  
* Encrypted transport and secure storage.

---

## **11\. Business Administration Dashboard**

Each client must have a dedicated dashboard.

Features:

* Total bookings.  
* Confirmed bookings.  
* Pending bookings.  
* Cancelled bookings.  
* Revenue.  
* Daily/weekly/monthly trends.  
* Resource utilisation.  
* Service popularity.  
* Staff performance.  
* Customer history.  
* Booking calendar.  
* Payment status.  
* Refund status.

Dashboard widgets should also use a configurable layout system.

The internal platform administrator should have a separate dashboard for managing all tenants.

---

## **12\. Notifications and Communication**

MVP:

* Email confirmations.  
* Booking status notifications.  
* Admin notifications.

P1:

* WhatsApp confirmations.  
* WhatsApp reminders.  
* SMS.  
* Cancellation notifications.  
* Rescheduling notifications.  
* Payment reminders.

Notifications should be configurable by business and event type.

Maintain delivery status where the provider supports it.

---

## **13\. Domain and Website Publishing**

Support:

* Preview URLs.  
* Platform subdomains.  
* Custom domains.  
* SSL.  
* Draft/published states.  
* Version management.  
* Domain verification.  
* Publishing and rollback.

A client website should be independently accessible.

The internal team should be able to deploy configuration changes without manually modifying source code for every client.

---

## **14\. Technical Architecture**

Recommend a modern stack compatible with Google Antigravity and AI-assisted development.

Potential baseline:

### **Frontend**

* React.  
* TypeScript.  
* Tailwind CSS.  
* CSS Grid.  
* Component-based widget architecture.

### **Backend**

* TypeScript backend.  
* REST APIs or a well-defined alternative.  
* Modular booking and business services.

### **Database**

* PostgreSQL.  
* Tenant-aware schema.  
* Transactional booking operations.

### **Storage**

* Object storage for images and documents.

### **Authentication**

* Secure authentication provider or custom implementation using established libraries.

### **Hosting**

* Google Cloud, Firebase ecosystem or another suitable cloud provider.  
* Evaluate cost and deployment complexity before choosing.

### **Payments**

* Razorpay/Cashfree sandbox for India.

### **Notifications**

* Email provider.  
* WhatsApp Business API integration in a later phase.

### **Monitoring**

* Application logs.  
* Error monitoring.  
* Performance monitoring.  
* Audit events.

Do not select technology solely because it belongs to Google. Prioritise maintainability, cost and reliability.

---

## **15\. Core Data Model**

Define entities for:

* Tenant.  
* TenantUser.  
* Role.  
* Permission.  
* Website.  
* Page.  
* LayoutVersion.  
* WidgetConfiguration.  
* Template.  
* Theme.  
* Business.  
* Location.  
* Resource.  
* Service.  
* Provider.  
* AvailabilitySchedule.  
* ScheduleException.  
* Booking.  
* BookingHold.  
* Customer.  
* Payment.  
* Refund.  
* Notification.  
* Subscription.  
* AuditLog.

Important relationships:

* A tenant can own multiple websites.  
* A website can have multiple pages.  
* A page can contain multiple widgets.  
* A business can have multiple locations.  
* A location can have multiple resources.  
* A resource can have multiple schedules.  
* A booking references a customer and the appropriate resource/service.  
* A booking can have one or more associated payment records.  
* Every tenant-owned entity must be associated with a tenant.

Design appropriate indexes, foreign keys, unique constraints and tenant isolation policies.

---

## **16\. Internal Website Creation Workflow**

The primary operational workflow:

1. Internal administrator creates a client.  
2. Configurator selects an industry.  
3. Platform loads the industry template.  
4. Configurator enters business details.  
5. Configurator adds resources and services.  
6. Configurator configures booking rules.  
7. Configurator customises the website through the grid editor.  
8. Configurator uploads branding and images.  
9. Platform generates the website preview.  
10. Internal team validates booking functionality.  
11. Website is published.  
12. Client receives administrative access.

Target standard delivery time: 1–2 days.

The platform should capture time spent in each step to identify bottlenecks.

---

## **17\. MVP Scope and Prioritisation**

### **Phase 1: MVP**

P0:

* Multi-tenant foundation.  
* Internal admin dashboard.  
* Client creation.  
* Industry templates.  
* Grid-based website editor.  
* Drag-and-drop widgets.  
* Widget resizing.  
* Responsive layout.  
* Layout persistence.  
* Website preview.  
* Website publishing.  
* Generic booking engine.  
* Three booking models.  
* Availability generation.  
* Booking conflict prevention.  
* Customer booking flow.  
* Authentication.  
* Business dashboard.  
* Simulated payment flow.  
* Booking confirmation.  
* Basic email notifications.

### **Phase 2: Commercial readiness**

P1:

* Production payment gateway.  
* WhatsApp integration.  
* Custom domains.  
* Advanced analytics.  
* Multiple locations.  
* Waitlists.  
* Memberships.  
* Coupons.  
* Advanced booking policies.  
* Client billing.  
* Advanced permissions.  
* Website version rollback.

### **Phase 3: Expansion**

P2:

* AI-assisted website generation.  
* AI-assisted layout recommendations.  
* Automated business onboarding.  
* Advanced marketing automation.  
* Advanced CRM.  
* More industry templates.  
* External integrations.  
* Agency white-label access.  
* Marketplace integrations.

---

## **18\. Acceptance Criteria**

### **Website Builder**

* User can add a widget.  
* User can move a widget.  
* User can resize it.  
* User can make it span multiple rows and columns.  
* User can rearrange multiple widgets.  
* User can save a layout.  
* User can preview it.  
* User can publish it.  
* Layout persists after reload.  
* Layout works on mobile.

### **Booking Engine**

* Available slots are generated correctly.  
* Booked inventory is unavailable.  
* Overlapping bookings are prevented.  
* Capacity cannot be exceeded.  
* Temporary holds expire.  
* Payment failures are handled.  
* Duplicate requests are handled safely.  
* Rescheduling validates new availability.

### **Multi-tenancy**

* Tenant data cannot be accessed by another tenant.  
* Tenant users only access authorised features.  
* Internal administrators have controlled cross-tenant access.

### **Website Deployment**

* New client can be created.  
* Template can be selected.  
* Layout can be configured.  
* Booking functionality can be tested.  
* Website can be published independently.

---

## **19\. Product Metrics**

### **Acquisition and delivery**

* Client onboarding time.  
* Website setup time.  
* Percentage of websites delivered within two days.  
* Setup cost per client.

### **Builder**

* Time to complete a layout.  
* Widgets used per website.  
* Layout customisation completion rate.  
* Number of manual interventions.  
* Editor error rate.

### **Booking**

* Booking conversion rate.  
* Slot utilisation.  
* Booking failure rate.  
* Double-booking incidents.  
* Payment success rate.  
* Cancellation rate.  
* No-show rate.

### **Business value**

* Revenue processed through bookings.  
* Repeat booking rate.  
* Reduction in manual booking effort.  
* Revenue per client.

### **SaaS economics**

* Monthly recurring revenue.  
* Average revenue per account.  
* Customer acquisition cost.  
* Support cost per tenant.  
* Gross margin.  
* Churn.

---

## **20\. Development Approach**

Do not start by building every feature simultaneously.

Follow this sequence:

1. Finalise architecture.  
2. Define the data model.  
3. Build tenant management.  
4. Build the grid layout engine.  
5. Build the widget library.  
6. Build the visual editor.  
7. Build the booking engine.  
8. Integrate the booking widgets into the renderer.  
9. Build the customer booking journey.  
10. Build the business dashboard.  
11. Implement payments.  
12. Add deployment and domain management.  
13. Test concurrency and tenant isolation.  
14. Conduct pilot deployments.

Prioritise working end-to-end functionality over isolated mockups.

Use real database persistence rather than frontend-only demonstrations.

Do not fake payment success or booking availability.

---

## **21\. Critical Product Principles**

1. Reusable architecture.  
2. Industry-aware configuration.  
3. Independent booking and presentation layers.  
4. Metabase-inspired visual flexibility.  
5. Production-grade booking integrity.  
6. Secure multi-tenancy.  
7. Mobile-first customer experience.  
8. India-first payment and communication workflows.  
9. Rapid client deployment.  
10. Modular feature expansion.  
11. Clear commercial packaging.  
12. Measurable business value.

---

## **22\. Final Product Definition**

Build a scalable, multi-tenant SaaS platform that enables internal teams and agencies to create, customise and deploy fully functional websites for appointment-based and resource-booking businesses.

The platform must combine a flexible Metabase-inspired grid-based visual website builder with a generic booking engine, configurable industry templates, customer-facing booking and checkout, business management dashboards and centralised SaaS administration.

The most important success criterion is the ability to deliver a fully customised, operational client website within 1–2 days without writing custom code for each business.

The first reference implementation should be a football turf booking website, designed so that the same underlying architecture can later support clinics, salons, fitness studios, tennis courts, badminton facilities and other appointment-based businesses.

**Build a reusable platform, not a collection of individual websites.**

