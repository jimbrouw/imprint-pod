MVP Product Requirements Document (PRD)
Project
Working title: Live Artist Checkout
Version: MVP v1
Author: Product Manager
Audience: Solo developer / AI coding agent

Overview
Build the smallest possible product that validates one assumption:
Can a live artist finish a digital portrait and turn it into a completed customer transaction in under 30 seconds?
This is not a print-on-demand platform.
This is not an Etsy competitor.
This is not a Shopify replacement.
This is a checkout and delivery system for artists creating personalised artwork live.
Everything else is out of scope.

Problem
Today, live artists typically:
	•	AirDrop artwork
	•	Email artwork
	•	Ask customers to message them later
	•	Hand over originals
	•	Lose contact with the customer
	•	Never upsell prints
Current POD platforms assume the artist is running an online shop.
Our users are not.
They are creating one unique artwork for one customer.

Goal
Reduce the entire post-artwork workflow to:
Finish artwork
↓
Upload image
↓
Customer receives page
↓
Pays
↓
Downloads artwork
↓
(Optional) Orders print
Total artist interaction after export:
Less than 30 seconds.

Target User
Only one user for MVP.
Primary
Live iPad portrait artists.
Examples:
	•	Caricature artists
	•	Wedding illustrators
	•	Event illustrators
	•	Brand activation artists
Ignore every other artist type.

User Journey
Artist
Artist logs in.
Creates an Event.
Shares Event QR code.
Customers arrive.
Artist creates portrait.
Exports image.
Uploads image.
Done.

Customer
Scans QR code.
Enters name or claim code.
Artwork appears.
Pays.
Downloads digital copy.
Optionally orders print.
Leaves.

Core Features
1. Artist Accounts
Simple authentication.
Fields:
	•	Name
	•	Email
	•	Password
No portfolios.
No profiles.
No followers.

2. Stripe Connect
Artist connects Stripe.
Platform never holds funds.
Payment goes directly to artist.
Platform fee configurable.

3. Create Event
Artist creates:
	•	Event Name
	•	Date
	•	Optional logo
Returns:
	•	Event URL
	•	Event QR Code
QR remains fixed for the entire event.
Never changes.

4. Customer Claim Page
Customer scans QR.
Sees:
	•	Event branding
	•	Enter Name or
	•	Enter 4-digit Claim Code
System loads artwork.

5. Upload Artwork
Artist uploads:
PNG
or
JPEG
from iPad.
Required:
	•	Artwork image
	•	Customer name or claim code
No editing tools.
No cropping.
No filters.

6. Artwork Page
Displays:
Large artwork preview
Buttons:
	•	Download Digital
	•	Buy Print
Simple.
No galleries.
No comments.
No sharing.

7. Checkout
Apple Pay
Google Pay
Stripe Checkout
No custom payment flow.

8. Print Options
Exactly three products.
	•	A5 Print
	•	A4 Print
	•	A3 Print
Nothing else.
No mugs.
No cushions.
No phone cases.
No product designer.

9. POD Integration
Integrate exactly ONE provider.
Recommended:
Prodigi
No provider switching.
No comparison.
No print settings.

10. Confirmation
Customer receives:
Email receipt
Download link
Print order confirmation (if applicable)

Artist Dashboard
Very simple.
Shows:
Upcoming Events
Past Events
Number of portraits
Revenue
Print orders
Nothing more.

Admin
Platform admin can view:
Artists
Events
Orders
Revenue
Platform fees
Basic analytics only.

Out of Scope
Do NOT build:
❌ Marketplace
❌ Artist discovery
❌ Public portfolios
❌ Product catalogue
❌ Social features
❌ Likes
❌ Comments
❌ Messaging
❌ CRM
❌ AI image editing
❌ AI descriptions
❌ Shopify integration
❌ Etsy integration
❌ Multiple POD providers
❌ Native iOS app
❌ Android app
❌ Inventory
❌ Coupons
❌ Gift cards
❌ Shipping configuration
❌ Tax management UI
❌ Multi-language
❌ Notifications beyond email

Success Metrics
The MVP succeeds if it proves these metrics are achievable in real events.
Artist
Time from artwork export to upload:
<30 seconds

Customer claim rate:
70%

Digital download rate:
90%

Print conversion:
10–20%

Artist setup time:
<10 minutes

Technical Stack
Frontend
	•	Next.js
	•	React
	•	Tailwind
Backend
	•	Supabase
Authentication
	•	Supabase Auth
Storage
	•	Supabase Storage
Payments
	•	Stripe Connect
	•	Stripe Checkout
Printing
	•	Prodigi API
QR Codes
	•	Generated automatically per Event
Hosting
	•	Vercel

Database (MVP)
Artists
	•	id
	•	name
	•	email
	•	stripe_account_id

Events
	•	id
	•	artist_id
	•	title
	•	qr_code
	•	slug
	•	created_at

Customers
	•	id
	•	event_id
	•	name
	•	claim_code
	•	email

Artworks
	•	id
	•	customer_id
	•	image_url
	•	uploaded_at

Orders
	•	id
	•	artwork_id
	•	type (digital / print)
	•	payment_status
	•	fulfilment_status

Design Principles
Every screen should answer one question.
Artist:
"What do I do next?"
Customer:
"How do I get my artwork?"
Nothing else.
If a feature doesn't directly reduce friction between finishing the portrait and completing the transaction, it doesn't belong in MVP.

Future Features (Explicitly Deferred)
	•	Wedding guest galleries
	•	Event analytics
	•	SMS delivery
	•	NFC handoff
	•	Queue management
	•	Multiple artists per event
	•	Team accounts
	•	Marketing automations
	•	Email campaigns
	•	CRM
	•	AI image enhancement
	•	Auto product generation
	•	Merchandise catalogue
	•	White-labelling
	•	Shopify/Etsy publishing
	•	Artist websites
	•	Mobile apps
	•	Offline mode

Definition of Done
The MVP is complete when a live artist can:
	1	Create an event.
	2	Display one QR code.
	3	Upload a portrait from an iPad.
	4	Associate it with a customer.
	5	Let the customer pay using Apple Pay or Google Pay.
	6	Allow immediate download of the digital artwork.
	7	Allow purchase of one of three print sizes.
	8	Automatically send the print order to Prodigi.
	9	Receive payment into their connected Stripe account.
If those nine steps work reliably during a real event, the MVP has successfully validated the core business hypothesis.

