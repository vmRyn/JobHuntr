# API Examples

Base URL: http://localhost:5000/api

## Register Job Seeker

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "seeker",
    "email": "seeker@example.com",
    "password": "secret123",
    "name": "Alex Doe",
    "bio": "Frontend engineer",
    "skills": "React, Tailwind, TypeScript",
    "experience": "3 years",
    "location": "Remote"
  }'

## Register Company

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "company",
    "email": "company@example.com",
    "password": "secret123",
    "companyName": "FutureLabs",
    "description": "Hiring product engineers",
    "industry": "Software"
  }'

## Login

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seeker@example.com",
    "password": "secret123"
  }'

Save the returned token as TOKEN.

## Create Job (Company)

curl -X POST http://localhost:5000/api/jobs \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Frontend Engineer",
    "description": "Build modern React interfaces.",
    "salary": "$120k-$150k",
    "location": "Remote",
    "requiredSkills": "React, Tailwind, GraphQL"
  }'

## Seeker Swipes Job

curl -X POST http://localhost:5000/api/swipes/job/JOB_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "direction": "right" }'

## Company Swipes Candidate

curl -X POST http://localhost:5000/api/swipes/candidate/CANDIDATE_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "direction": "right",
    "jobId": "JOB_ID"
  }'

If both are right swipes, the response includes matched: true and a match object.

## Get My Matches

curl -X GET http://localhost:5000/api/matches \
  -H "Authorization: Bearer TOKEN"

## Get Messages for Match

curl -X GET http://localhost:5000/api/messages/MATCH_ID \
  -H "Authorization: Bearer TOKEN"

## Send Message

curl -X POST http://localhost:5000/api/messages/MATCH_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "text": "Hey! I would love to discuss the role." }'

## Socket.io Events

- Client emits: joinMatch with matchId
- Server emits: newMessage with the created message payload
