import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import {decode, sign, verify} from 'hono/jwt'
import {signupInput, signinInput} from "@100xdevs/medium-common"

export const userRouter =  new Hono<{
    Bindings: {
      DATABASE_URL: string
      JWT_SECRET: string
    }
  }>()

//DATABASE_URL AND JWT_SECRET should be defined in wrangler.toml initially

userRouter.post('/signup', async (c) => {
  
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
  
    const body = await c.req.json();
    const {success} = signupInput.safeParse(body);
    if(!success){
        c.status(411);
    return c.json({
        message: "Inputs not correct"
    })    }
   //try so that duplicate accounts aren't created
   try {
     const user = await prisma.user.create({
        data: {
          email: body.email,
          password: body.password
        }
    })
    const jwt = await sign({id: user.id}, c.env.JWT_SECRET)
    return c.text(
      jwt)}catch(e){
        return c.text('Invalid')
      }
  })
  
  userRouter.post('/signin', async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const body = await c.req.json();
    const {success} = signinInput.safeParse(body);
    if(!success){
        c.status(411);
    return c.json({
        message: "Inputs not correct"
    })    }
    try {
      const user = await prisma.user.findUnique({
      where: {
        email:body.email,
        password: body.password
      }
    });
  
    if(!user){
      c.status(403);
      return c.json({error: "user not found"})
    }
    const jwt = await sign({id: user.id}, c.env.JWT_SECRET)
    return c.text(jwt)}catch(e){
      return c.text('Invalid')
    }
  })