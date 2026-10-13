"use client";

import React from "react";
import Link from "next/link";
import {
  Building,
  Plus,
  Ticket,
} from "lucide-react";

import {
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

import {
  Authenticated,
  Unauthenticated,
} from "convex/react";

import { BarLoader } from "react-spinners";

import { useStoreUser } from "@/hooks/use-store-user";
import { useOnboarding } from "@/hooks/use-onboarding";

import OnboardingModal from "./onboarding-modal";
import SearchLocationBar from "./search-location-bar";

import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Header() {
  const { isLoading } = useStoreUser();

  const {
    showOnboarding,
    handleOnboardingComplete,
    handleOnboardingSkip,
  } = useOnboarding();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-xl z-20 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* ---------------------------------------------------------------- */}
          {/* Logo                                                            */}
          {/* ---------------------------------------------------------------- */}

          <Link
            href="/"
            className="flex items-center"
          >
            <Image
              src="/spott.png"
              alt="Spott logo"
              width={500}
              height={500}
              className="w-full h-11"
              priority
            />
          </Link>

          {/* ---------------------------------------------------------------- */}
          {/* Search & Location - Desktop                                    */}
          {/* ---------------------------------------------------------------- */}

          <div className="hidden md:flex flex-1 justify-center">
            <SearchLocationBar />
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Right Side Actions                                              */}
          {/* ---------------------------------------------------------------- */}

          <div className="flex items-center">
            {/* Explore */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="mr-2"
            >
              <Link href="/explore">
                Explore
              </Link>
            </Button>

            {/* ------------------------------------------------------------ */}
            {/* Authenticated User                                           */}
            {/* ------------------------------------------------------------ */}

            <Authenticated>
              {/* Create Event */}
              <Button
                size="sm"
                asChild
                className="flex gap-2 mr-4"
              >
                <Link href="/create-event">
                  <Plus className="w-4 h-4" />

                  <span className="hidden sm:inline">
                    Create Event
                  </span>
                </Link>
              </Button>

              {/* User Menu */}
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9",
                  },
                }}
              >
                <UserButton.MenuItems>
                  {/* My Tickets */}
                  <UserButton.Link
                    label="My Tickets"
                    labelIcon={
                      <Ticket size={16} />
                    }
                    href="/my-tickets"
                  />

                  {/* My Events */}
                  <UserButton.Link
                    label="My Events"
                    labelIcon={
                      <Building size={16} />
                    }
                    href="/my-events"
                  />

                  {/* Account */}
                  <UserButton.Action label="manageAccount" />
                </UserButton.MenuItems>
              </UserButton>
            </Authenticated>

            {/* ------------------------------------------------------------ */}
            {/* Unauthenticated User                                         */}
            {/* ------------------------------------------------------------ */}

            <Unauthenticated>
              <SignInButton mode="modal">
                <Button size="sm">
                  Sign In
                </Button>
              </SignInButton>
            </Unauthenticated>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Mobile Search                                                    */}
        {/* ---------------------------------------------------------------- */}

        <div className="md:hidden border-t px-3 py-3">
          <SearchLocationBar />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Loading Bar                                                      */}
        {/* ---------------------------------------------------------------- */}

        {isLoading && (
          <div className="absolute bottom-0 left-0 w-full">
            <BarLoader
              width="100%"
              color="#a855f7"
            />
          </div>
        )}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Onboarding                                                         */}
      {/* ------------------------------------------------------------------ */}

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleOnboardingSkip}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}