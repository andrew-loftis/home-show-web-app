// Mock data for HomeShow (formerly LeadPass)
export const mockAttendees = [
  {
    id: "att-1",
    name: "Jane Smith",
    email: "jane.smith@email.com",
    phone: "615-555-1234",
    zip: "37209",
    interests: ["Kitchen", "Bath", "Windows"],
    qrData: "PC-HS-1234",
    shortCode: "PC-HS-1234",
    consentEmail: true,
    consentSMS: false,
    savedBusinessCards: [],
    card: {
      profileImage: "https://placehold.co/200x200?text=JS",
      backgroundImage: "https://placehold.co/400x300?text=Home+Background",
      familySize: 4,
      visitingReasons: ["Kitchen remodel", "Bathroom remodel"],
      bio: "Married with two kids, looking to renovate our kitchen and master bath.",
      location: "Nashville, TN"
    }
  },
  {
    id: "att-2",
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "615-555-5678",
    zip: "37211",
    interests: ["Solar", "Roofing"],
    qrData: "PC-HS-5678",
    shortCode: "PC-HS-5678",
    consentEmail: true,
    consentSMS: true,
    savedBusinessCards: [],
    card: {
      profileImage: "https://placehold.co/200x200?text=JD",
      backgroundImage: "https://placehold.co/400x300?text=Solar+Home",
      familySize: 2,
      visitingReasons: ["Solar installation", "Roofing repair"],
      bio: "Homeowner interested in sustainable energy solutions.",
      location: "Franklin, TN"
    }
  },
  {
    id: "att-3",
    name: "Emily Turner",
    email: "emily.turner@email.com",
    phone: "615-555-9012",
    zip: "37027",
    interests: ["Landscaping", "Flooring", "Painting"],
    qrData: "PC-HS-9012",
    shortCode: "PC-HS-9012",
    consentEmail: false,
    consentSMS: true,
    savedBusinessCards: [],
    card: {
      profileImage: "https://placehold.co/200x200?text=ET",
      backgroundImage: "https://placehold.co/400x300?text=Garden+View",
      familySize: 3,
      visitingReasons: ["Landscaping", "Floor plans"],
      bio: "First-time homebuyer planning interior and exterior improvements.",
      location: "Brentwood, TN"
    }
  }
];

export const mockVendors = [
  {
    id: "ven-1",
    name: "Kitchen Pros",
    category: "Kitchen",
    booth: "A1",
    contactEmail: "info@kitchenpros.com",
    contactPhone: "615-555-1111",
    logoUrl: "https://placehold.co/64x64?text=KP",
    approved: true,
    verified: true,
    profile: {
      introVideo: "https://www.youtube.com/watch?v=abcd1234",
      homeShowVideo: "https://www.youtube.com/watch?v=homeshow1",
      website: "https://kitchenpros.com",
      facebook: "https://facebook.com/kitchenpros",
      instagram: "https://instagram.com/kitchenpros",
      description: "Expert kitchen remodelers with 20+ years experience.",
      specialOffer: "10% off for home show attendees!",
      backgroundImage: "https://placehold.co/400x600?text=Kitchen+Showroom",
      profileImage: "https://placehold.co/200x200?text=Kitchen+Pros",
      businessCardFront: "https://placehold.co/350x200?text=Kitchen+Pros+Front",
      businessCardBack: "https://placehold.co/350x200?text=Kitchen+Pros+Back",
      bio: "Tennessee's premier kitchen remodeling experts. We transform your kitchen dreams into reality with custom cabinets, countertops, and complete renovations.",
      selectedSocials: ["website", "facebook", "instagram"]
    },
    boothCoordinates: { x: 40, y: 60 }
  },
  {
    id: "ven-2",
    name: "Bath Masters",
    category: "Bath",
    booth: "B2",
    contactEmail: "contact@bathmasters.com",
    logoUrl: "https://placehold.co/64x64?text=BM",
    approved: true,
    verified: true,
    profile: {
      introVideo: "https://www.youtube.com/watch?v=efgh5678",
      homeShowVideo: "https://www.youtube.com/watch?v=homeshow2",
      website: "https://bathmasters.com",
      instagram: "https://instagram.com/bathmasters",
      description: "Luxury bath renovations and fixtures.",
      specialOffer: "Free consultation for home show attendees!",
      backgroundImage: "https://placehold.co/400x600?text=Luxury+Bathroom",
      profileImage: "https://placehold.co/200x200?text=Bath+Masters",
      businessCardFront: "https://placehold.co/350x200?text=Bath+Masters+Front",
      businessCardBack: "https://placehold.co/350x200?text=Bath+Masters+Back",
      bio: "Creating spa-like bathroom experiences in Tennessee homes. From modern renovations to classic designs, we handle every detail.",
      selectedSocials: ["website", "instagram"]
    },
    boothCoordinates: { x: 120, y: 60 }
  },
  {
    id: "ven-3",
    name: "Solar Solutions",
    category: "Solar",
    booth: "C3",
    contactEmail: "hello@solarsolutions.com",
    logoUrl: "https://placehold.co/64x64?text=SS",
    approved: true,
    verified: true,
    profile: {
      introVideo: "https://www.youtube.com/watch?v=ijkl9012",
      homeShowVideo: "https://www.youtube.com/watch?v=homeshow3",
      website: "https://solarsolutions.com",
      twitter: "https://twitter.com/solarsolutions",
      description: "Solar panel installation and maintenance.",
      specialOffer: "$500 off new installs!",
      backgroundImage: "https://placehold.co/400x600?text=Solar+Panels",
      profileImage: "https://placehold.co/200x200?text=Solar+Solutions",
      businessCardFront: "https://placehold.co/350x200?text=Solar+Solutions+Front",
      businessCardBack: "https://placehold.co/350x200?text=Solar+Solutions+Back",
      bio: "Powering Tennessee homes with clean, renewable energy. Expert solar installation with guaranteed savings on your electric bill.",
      selectedSocials: ["website", "twitter"]
    },
    boothCoordinates: { x: 200, y: 60 }
  },
  {
    id: "ven-4",
    name: "Roofing Experts",
    category: "Roofing",
    booth: "D4",
    contactEmail: "sales@roofingexperts.com",
    logoUrl: "https://placehold.co/64x64?text=RE",
    approved: true,
    verified: true,
    profile: {
      homeShowVideo: "https://www.youtube.com/watch?v=homeshow4",
      website: "https://roofingexperts.com",
      linkedin: "https://linkedin.com/company/roofingexperts",
      description: "Reliable roofing for TN homes.",
      specialOffer: "Lifetime warranty for home show visitors!",
      backgroundImage: "https://placehold.co/400x600?text=Roofing+Work",
      profileImage: "https://placehold.co/200x200?text=Roofing+Experts",
      businessCardFront: "https://placehold.co/350x200?text=Roofing+Experts+Front",
      businessCardBack: "https://placehold.co/350x200?text=Roofing+Experts+Back",
      bio: "Protecting Tennessee homes with quality roofing solutions. From repairs to complete replacements, we've got you covered.",
      selectedSocials: ["website", "linkedin"]
    },
    boothCoordinates: { x: 40, y: 140 }
  },
  {
    id: "ven-5",
    name: "Flooring Direct",
    category: "Flooring",
    booth: "E5",
    contactEmail: "support@flooringdirect.com",
    logoUrl: "https://placehold.co/64x64?text=FD",
    approved: true,
    verified: true,
    profile: {
      homeShowVideo: "https://www.youtube.com/watch?v=homeshow5",
      website: "https://flooringdirect.com",
      tiktok: "https://tiktok.com/@flooringdirect",
      youtube: "https://youtube.com/flooringdirect",
      description: "TN's #1 flooring specialists.",
      specialOffer: "Free samples for home show guests!",
      backgroundImage: "https://placehold.co/400x600?text=Beautiful+Floors",
      profileImage: "https://placehold.co/200x200?text=Flooring+Direct",
      businessCardFront: "https://placehold.co/350x200?text=Flooring+Direct+Front",
      businessCardBack: "https://placehold.co/350x200?text=Flooring+Direct+Back",
      bio: "From hardwood to luxury vinyl, we provide Tennessee's finest flooring options with expert installation and unbeatable prices.",
      selectedSocials: ["website", "tiktok", "youtube"]
    },
    boothCoordinates: { x: 120, y: 140 }
  }
];

export const mockLeads = [
  {
    id: "lead-1",
    attendee_id: "att-1",
    vendor_id: "ven-1",
    timestamp: Date.now() - 3600000,
    exchangeMethod: "card_share",
    emailSent: true,
    cardShared: true
  },
  {
    id: "lead-2",
    attendee_id: "att-2",
    vendor_id: "ven-2",
    timestamp: Date.now() - 1800000,
    exchangeMethod: "card_share",
    emailSent: true,
    cardShared: true
  }
];
