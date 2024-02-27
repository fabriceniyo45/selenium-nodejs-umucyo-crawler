const { Builder, Browser, By } = require("selenium-webdriver");

const amqplib = require("amqplib");

const queue = "crawler_queue";

(async () => {
  try {
    const conn = await amqplib.connect("amqp://localhost:5672");

    const ch1 = await conn.createChannel();
    await ch1.assertQueue(queue, {
      durable: false,
    });

    console.log("[*] Waiting for messages in %s. To exit press CTRL+C", queue);
    // Listener
    ch1.consume(queue, async (msg) => {
      if (msg !== null) {
        console.log("[x] Recieved: ", msg.content.toString());
        await getUmucyoAssignments();
        ch1.ack(msg); //tell/acknowledge the server that we have received the message so that it can be removed from the queue
      } else {
        console.log("Consumer cancelled by server");
      }
    });
  } catch (error) {
    console.log("Something went wrong: ", error.message || error);
  }
})();

async function getUmucyoAssignments() {
  let driver = await new Builder().forBrowser(Browser.CHROME).build();
  try {
    await driver.get("https://umucyo.gov.rw/");
    await driver.manage().window().setRect({ width: 1512, height: 859 });
    await driver.switchTo().frame(7);
    await driver.findElement(By.linkText("e-Bidding")).click();
    await driver.findElement(By.linkText("List of advertising (all)")).click();
    await driver.findElement(By.id("tendTypeCd")).click();
    {
      const dropdown = await driver.findElement(By.id("tendTypeCd"));
      await dropdown
        .findElement(By.xpath("//option[. = 'Consultant Services']"))
        .click();
    }
    await driver.findElement(By.id("recordCountPerPage")).click();
    {
      const dropdown = await driver.findElement(By.id("recordCountPerPage"));
      await dropdown
        .findElement(By.xpath("//option[. = '50 records']"))
        .click();
    }

    const assignments = [];

    //getting the table with assignments
    const table = await driver.findElement(
      By.xpath("/html/body/div[1]/div[3]/div[2]/form[2]/table")
    );

    const trs = await table.findElements(By.tagName("tr"));

    //looping through the table to get the data
    //we dont need the headers so we start from 1
    for (let i = 1; i < trs.length; i++) {
      const tds = await trs[i].findElements(By.tagName("td"));
      //checking if we have correct data in this row otherwise skip it
      if (tds.length === 8) {
        //we are good to go
        //currently, the assingments table have 8 columns
        const assignment = {
          tenderName: await tds[1].getText(),
          tenderNumber: await tds[2].getText(),
          status: await tds[3].getText(),
          advertisingDate: await tds[4].getText(),
          submissionDeadline: await tds[5].getText(),
          openingDate: await tds[6].getText(),
          stageType: await tds[7].getText(),
        };

        assignments.push(assignment);
      }
    }

    //log the assignments
    console.log({ totalAssignments: assignments.length, assignments });
  } catch (error) {
    //handle the error
    console.log("Error: ", error.message || "Something went wrong");
  } finally {
    await driver.quit();
  }
}

// getUmucyoAssignments();
