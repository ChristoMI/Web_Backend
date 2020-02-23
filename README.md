# Web_Backend
The repository contains the code of backend implementations that correspond to functional req-s for the "Bug Booking" project

# Automation
Integration tests run on both PRs and commits to master

PRs will additionally output the preview of pulumi changes as github comment

Each commit to master will trigger a deploy of the infrastructure via pulumi

# To develop

To use aliases, you must add this line in the very main file of your application, before any code: `import 'module-alias/register'; // for alias`

Test locally via integration tests

Update AWS infrastructure in `index.ts`

Add DynamoDb tables to `infrastructure\dynamodb.ts`

# To test
- Run `docker-compose up` to launch local DynamoDB
- Run `npm run initLocal` to create local DynamoDB tables
- Run `npm test` to run integration tests (they use local DynamoDb)

# To deploy
- Make sure you have a AWS profile called `pulumi` with correct credentials
- Run `pulumi up`
- Check the preview
- If the preview is ok, confirm the deployment
