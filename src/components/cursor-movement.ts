import { CursorUser, getUserTrait } from './cursor-profiles'

export interface Position {
  x: number
  y: number
}

export interface MovementTarget {
  element: Element
  priority: number
  rect: DOMRect
}

export class CursorMovement {
  private currentPosition: Position
  private waypoints: Position[] = []
  private currentWaypointIndex: number = 0
  private moveStartTime: number = 0
  private moveDuration: number = 0
  private isMoving: boolean = false
  private pauseUntil: number = 0
  private startPosition?: Position // Store the exact start position for smooth interpolation
  private user: CursorUser
  private viewportWidth: number
  private viewportHeight: number

  constructor(user: CursorUser, startPosition?: Position) {
    this.user = user
    this.viewportWidth = window.innerWidth
    this.viewportHeight = window.innerHeight
    
    // Start from a nice position within viewport
    this.currentPosition = startPosition || {
      x: 200 + Math.random() * (this.viewportWidth - 400),
      y: 200 + Math.random() * (this.viewportHeight - 400)
    }
    
    // Generate initial smooth path
    this.generateSmoothPath()
    

  }

  private getRandomEdgePosition(): Position {
    const side = Math.floor(Math.random() * 4)
    switch (side) {
      case 0: // top
        return { x: Math.random() * this.viewportWidth, y: -20 }
      case 1: // right  
        return { x: this.viewportWidth + 20, y: Math.random() * this.viewportHeight }
      case 2: // bottom
        return { x: Math.random() * this.viewportWidth, y: this.viewportHeight + 20 }
      case 3: // left
        return { x: -20, y: Math.random() * this.viewportHeight }
      default:
        return { x: Math.random() * this.viewportWidth, y: Math.random() * this.viewportHeight }
    }
  }

  private generateSmoothPath() {
    // Generate 3-5 smooth waypoints for natural movement
    const numWaypoints = 3 + Math.floor(Math.random() * 3)
    this.waypoints = []
    this.currentWaypointIndex = 0
    
    const contentArea = {
      minX: 100,
      maxX: Math.min(800, this.viewportWidth - 100),
      minY: 100,
      maxY: this.viewportHeight - 100
    }
    
    // Add some interesting points near content if available
    const interestingPoints = this.getInterestingPoints()
    
    for (let i = 0; i < numWaypoints; i++) {
      let waypoint: Position
      
      // 60% chance to use interesting point, 40% random
      if (interestingPoints.length > 0 && Math.random() < 0.6) {
        const target = interestingPoints[Math.floor(Math.random() * interestingPoints.length)]
        waypoint = {
          x: target.x + (Math.random() - 0.5) * 100, // Add some randomness around target
          y: target.y + (Math.random() - 0.5) * 50
        }
      } else {
        waypoint = {
          x: contentArea.minX + Math.random() * (contentArea.maxX - contentArea.minX),
          y: contentArea.minY + Math.random() * (contentArea.maxY - contentArea.minY)
        }
      }
      
      // Ensure waypoint is within bounds
      waypoint.x = Math.max(contentArea.minX, Math.min(contentArea.maxX, waypoint.x))
      waypoint.y = Math.max(contentArea.minY, Math.min(contentArea.maxY, waypoint.y))
      
      this.waypoints.push(waypoint)
    }
  }

  private getInterestingPoints(): Position[] {
    const points: Position[] = []
    
    // Find some interesting elements to move near
    const selectors = ['h1', 'h2', 'h3', 'a[href]', '[class*="project"]', '[class*="story"]']
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      Array.from(elements).slice(0, 3).forEach(element => { // Limit to avoid too many
        const rect = element.getBoundingClientRect()
        
        if (rect.width > 0 && rect.height > 0 && 
            rect.top > 0 && rect.bottom < this.viewportHeight &&
            rect.left > 0 && rect.right < this.viewportWidth) {
          
          points.push({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          })
        }
      })
    })
    
    return points
  }

  public forceNewPath(): void {
    this.generateSmoothPath()
    this.isMoving = false
    this.pauseUntil = 0
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private shouldPause(): boolean {
    const trait = getUserTrait(this.user.personality)
    return Math.random() < trait.pauseProbability
  }

  public update(deltaTime: number): Position {
    const now = performance.now()
    
    // Check if we're in a pause state
    if (now < this.pauseUntil) {
      return this.currentPosition
    }

    // If not moving, start moving to next waypoint
    if (!this.isMoving) {
      this.startNextMovement(now)
    }

    // Update position along current movement
    if (this.isMoving && this.moveDuration > 0) {
      const elapsed = now - this.moveStartTime
      let progress = Math.min(elapsed / this.moveDuration, 1)
      
      // Apply smooth easing
      progress = this.easeInOutCubic(progress)
      
      const currentWaypoint = this.waypoints[this.currentWaypointIndex]
      if (currentWaypoint) {
        // Get start position - use stored start position to avoid jumps
        if (!this.startPosition) {
          this.startPosition = { ...this.currentPosition }
        }
        
        // Smooth interpolation between start and target
        this.currentPosition.x = this.startPosition.x + (currentWaypoint.x - this.startPosition.x) * progress
        this.currentPosition.y = this.startPosition.y + (currentWaypoint.y - this.startPosition.y) * progress
        
        // Check if movement is complete
        if (progress >= 1) {
          this.currentPosition = { ...currentWaypoint }
          this.isMoving = false
          this.currentWaypointIndex++
          this.startPosition = undefined // Clear start position
          
          // Add pause between movements
          this.pauseUntil = now + 800 + Math.random() * 1500 // 0.8-2.3 second pause
          
          // If we've reached all waypoints, generate new path
          if (this.currentWaypointIndex >= this.waypoints.length) {
            this.generateSmoothPath()
          }
        }
      }
    }

    return this.currentPosition
  }

  private startNextMovement(now: number) {
    if (this.currentWaypointIndex < this.waypoints.length) {
      const target = this.waypoints[this.currentWaypointIndex]
      const distance = Math.sqrt(
        Math.pow(target.x - this.currentPosition.x, 2) + 
        Math.pow(target.y - this.currentPosition.y, 2)
      )
      
      // Base movement speed: 100-180 pixels per second
      const trait = getUserTrait(this.user.personality)
      const baseSpeed = 100 + trait.speed * 80
      
      this.moveDuration = Math.max(1000, (distance / baseSpeed) * 1000) // Minimum 1 second, convert to milliseconds
      this.moveStartTime = now
      this.isMoving = true
      this.startPosition = { ...this.currentPosition } // Store exact start position
    }
  }

  public getCurrentPosition(): Position {
    return { ...this.currentPosition }
  }

  public getRemainingWaypoints(): number {
    return Math.max(0, this.waypoints.length - this.currentWaypointIndex)
  }
}
