import { Instagram, Mail, Twitter, Youtube } from "lucide-react";
import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-gray-800/50 py-8 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-6 text-sm text-gray-400">
        Lets create and manage events 
      </div>

      <div className="flex gap-4 items-center">
        <a
          href="https://instagram.com/_mr.mahi_09?srtk=MTUweXV1cXFvd3ZtMA%3D%3D"
        >
          <Youtube />
        </a>
        <a
          href="https://instagram.com/dhanush__339?exln=MXY2OTN6YzJ3eGYzdA%3D%3D"
        >
          <Instagram className="w-5 h-5" />
        </a>
        <a href="https://instagram.com/v_v_karthik_63?vrfl=dXZreHJjN204bHo3" className="text-gray-400">
          <Twitter className="w-5 h-5" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;

