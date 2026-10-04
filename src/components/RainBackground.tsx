"use client";

import React, { useEffect, useRef } from "react";

export function RainBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const maxParticles = 100;

    class Particle {
      x: number;
      y: number;
      speed: number;
      length: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.speed = Math.random() * 5 + 10;
        this.length = Math.random() * 20 + 10;
        this.opacity = Math.random() * 0.3 + 0.1;
      }

      update() {
        this.y += this.speed;
        if (this.y > h) {
          this.y = -this.length;
          this.x = Math.random() * w;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.strokeStyle = `rgba(150, 150, 200, ${this.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    let animationId: number;
    let lightningOpacity = 0;
    let nextLightningTime = Date.now() + 2000 + Math.random() * 3000;
    let lightningPaths: {x: number, y: number}[][] = [];

    const generateLightning = () => {
      lightningPaths = [];
      let mainPath: {x: number, y: number}[] = [];
      let currentX = Math.random() * w;
      let currentY = 0;
      mainPath.push({x: currentX, y: currentY});
      
      while(currentY < h) {
         currentX += (Math.random() - 0.5) * 150;
         currentY += Math.random() * 50 + 20;
         mainPath.push({x: currentX, y: currentY});
         
         if (Math.random() > 0.7) { 
            let branchPath = [{x: currentX, y: currentY}];
            let bx = currentX;
            let by = currentY;
            let branchLen = Math.floor(Math.random() * 5) + 3;
            for(let i = 0; i < branchLen; i++) {
                bx += (Math.random() - 0.5) * 100;
                by += Math.random() * 40 + 10;
                branchPath.push({x: bx, y: by});
            }
            lightningPaths.push(branchPath);
         }
      }
      lightningPaths.push(mainPath);
    };

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      
      // subtle dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(1, "#020617");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // lightning effect
      const now = Date.now();
      if (now > nextLightningTime) {
        lightningOpacity = 1.0; // Trigger flash
        nextLightningTime = now + 3000 + Math.random() * 7000;
        generateLightning();
      }

      if (lightningOpacity > 0) {
        // Flash screen background
        ctx.fillStyle = `rgba(230, 240, 255, ${lightningOpacity * 0.15})`;
        ctx.fillRect(0, 0, w, h);
        
        // Draw lightning bolt
        ctx.save();
        ctx.lineJoin = "miter";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "rgba(165, 243, 252, 0.8)"; // Cyan glow
        
        lightningPaths.forEach(path => {
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for(let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${lightningOpacity})`;
          ctx.lineWidth = path.length > 5 ? 3 : 1.5; 
          ctx.stroke();
        });
        
        ctx.restore();
        
        // Flicker effect: random fade out
        lightningOpacity -= (Math.random() * 0.04 + 0.01);
      }

      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: "#0f172a" }}
    />
  );
}
