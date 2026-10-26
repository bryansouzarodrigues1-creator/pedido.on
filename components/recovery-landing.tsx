"use client";
import {useEffect} from "react";
import {recoveryLinkTarget} from "@/lib/recovery-link";
export default function RecoveryLanding(){useEffect(()=>{const target=recoveryLinkTarget(location.search,location.hash);if(target){history.replaceState(null,"",location.pathname);location.replace(target);}},[]);return null;}
