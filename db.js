const { Client } = require('pg')
const client = new Client({
  connectionString : process.env.DB_URI
})
connect()
setup()
async function connect() {
  await client.connect();
  console.log("connected to db")
}

async function setup() {

  //RESET
  //await client.query(`DROP TABLE Identities; DROP TABLE Users; DROP TABLE Bounties; DROP TABLE Issues; DROP TABLE Votes; DROP TABLE Comments;`)

  await client.query(` CREATE TABLE IF NOT EXISTS Identities(
      url VARCHAR(128),
      name VARCHAR(64),
      PRIMARY KEY(url),
      UNIQUE(name)
  )`)

  await client.query(` CREATE TABLE IF NOT EXISTS Users(
    id SERIAL PRIMARY KEY,
    provider_id VARCHAR(128),
    provider_name VARCHAR(32),
    created_on TIMESTAMP NOT NULL,
    identity_url VARCHAR(128) REFERENCES Identities(url),
    privilege_level INT DEFAULT 0,
    UNIQUE(provider_id,provider_name)
  )
    `)

  await client.query(`CREATE TABLE IF NOT EXISTS Issues(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(id),
    created_on TIMESTAMP NOT NULL,
    title VARCHAR(100) NOT NULL UNIQUE,
    link VARCHAR(128),
    description TEXT
  )`)

  await client.query(`CREATE TABLE IF NOT EXISTS Bounties(
    issue_id INTEGER NOT NULL REFERENCES Issues(id),
    user_id INTEGER NOT NULL REFERENCES Users(id),
    identity_url VARCHAR(128) NOT NULL REFERENCES Identities(url),
    amount INTEGER NOT NULL,
    created_on TIMESTAMP NOT NULL,
    funding_secured BOOLEAN DEFAULT false,
    announchment_link VARCHAR(128),
    condition_text TEXT,
    payed_out_to VARCHAR(128) REFERENCES Identities(url),
    PRIMARY KEY(issue_id,user_id,identity_url)
  )
`)


  await client.query(`CREATE TABLE IF NOT EXISTS Comments(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(id),
    text TEXT NOT NULL,
    issue_id INTEGER REFERENCES Issues(id),
    comment_id INTEGER REFERENCES Comments(id)
  )
    `)

  await client.query(`CREATE TABLE IF NOT EXISTS Votes(
    user_id INTEGER NOT NULL REFERENCES Users(id),
    comment_id INTEGER NOT NULL REFERENCES Comments(id),
    PRIMARY KEY(user_id,comment_id),
    weight INTEGER DEFAULT 1
  )`)

  //VIEWS
  /*
  await client.query(`CREATE VIEWUserData AS
    SELECT Users.*,Identities.url,Identities.name
    FROM Users,Identities
    WHERE Users.identity_url = Identities.url
    `)
    */
  /*


  //queries
  await client.query(`
    SELECT *, Sum(Bounties.amount) as total_bounty_amount
    FROM Issues,UserData,Identities,Bounties
    WHERE Issues.user_id = UserData.id
    AND Issues.identity_id = Identities.id
    GROUP BY Bounties.issue_id
    SORT BY total_bounty_amount DESC
    `)
    */


}

module.exports = client;
