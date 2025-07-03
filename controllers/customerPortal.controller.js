const axios = require("axios");
const xml2js = require('xml2js');
const jwt = require("jsonwebtoken");

// Authentication
const login = async (req, res) => {
    const { customerId, password } = req.body;

    const { SAP_USERNAME, SAP_PASSWORD, JWT_SECRET_CUSTOMER } = process.env;

    const soapEnvelope = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                   xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerLogin1>
                <CustomerId>${customerId}</CustomerId>
                <Password>${password}</Password>
            </urn:ZfmCustomerLogin1>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(
            'http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_login1?sap-client=100',
            soapEnvelope,
            {
                headers: {
                    'Content-Type': 'application/soap+xml;charset=UTF-8',
                },
                auth: {
                    username: SAP_USERNAME,
                    password: SAP_PASSWORD,
                },
            }
        );

        xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
            if (err) {
                console.error("XML Parse Error:", err);
                return res.status(500).json({ error: 'Failed to parse SOAP response' });
            }
            try {
                const body = result['env:Envelope']?.['env:Body'];
                const loginResponse = body?.['n0:ZfmCustomerLogin1Response'];

                if (loginResponse) {
                    const isAuthenticated = loginResponse.Status;
                    const message = loginResponse.Message;

                    if (isAuthenticated == 1) {
                        const token = jwt.sign({ customerId }, JWT_SECRET_CUSTOMER, { expiresIn: '3d' });

                        res.cookie('authToken_customer', token, {
                            httpOnly: true,
                            secure: true,
                            sameSite: 'Strict',
                            maxAge: 3 * 24 * 60 * 60 * 1000 // 3days
                        });

                        return res.status(200).send({
                            isAuthenticated,
                            message: 'Login successful'
                        });
                    } else {
                        return res.status(401).send({
                            isAuthenticated,
                            message
                        });
                    }
                } else {
                    console.error("ZfmCustomerLoginResponse not found in response:", JSON.stringify(body, null, 2));
                    return res.status(400).send({ message: 'Invalid response from SAP server' });
                }
            } catch (parseErr) {
                console.error("Unexpected structure in SOAP response:", parseErr);
                return res.status(500).send({ message: 'Unexpected response structure from SAP' });
            }
        });
    } catch (error) {
        console.error('SOAP Error:', error.message);
        return res.status(500).json({ message: 'SOAP Request failed', details: error.message });
    }
};
const logout = async (req, res) => {
    res.clearCookie('authToken_customer', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });
    res.status(200).send({
        isAuthenticated: 0,
        message: 'Logged out successfully'
    });
};

// Profile
const profile = async (req, res) => {
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;

    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_profile_info?sap-client=100";

    const soapBody = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                   xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerProfileInfo>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZfmCustomerProfileInfo>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const profileData = result["env:Envelope"]["env:Body"]["n0:ZfmCustomerProfileInfoResponse"];

        // console.log("✅ Customer Profile Info:", profileData);

        res.status(200).send(profileData.ProfileData || profileData);
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching customer profile");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching customer profile");
        }
    }
};

// Dashboard
const inquiryData = async (req, res) => {
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;
    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_inquiry?sap-client=100";

    const soapBody = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
                xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerInquiries>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZfmCustomerInquiries>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });


        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const finalResult = result["env:Envelope"]["env:Body"]["n0:ZfmCustomerInquiriesResponse"];

        res.status(200).send(finalResult.InquiryData.item);
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching inquiry data");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching inquiry data");
        }
    }
}
const salesOrderData = async (req, res) => {
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;
    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_sales_order?sap-client=100";

    const soapBody = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerSalesOrder>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZfmCustomerSalesOrder>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });
        

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const finalResult = result["env:Envelope"]["env:Body"]["n0:ZfmCustomerSalesOrderResponse"];

        res.status(200).send(finalResult.SalesOrderData.item);
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching inquiry data");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching inquiry data");
        }
    }
}
const deliveriesrData = async (req, res) => {
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;
    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_deliveries?sap-client=100";

    const soapBody = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerDeliveries>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZfmCustomerDeliveries>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const finalResult = result["env:Envelope"]["env:Body"]["n0:ZfmCustomerDeliveriesResponse"];

        res.status(200).send(finalResult.DeliveryData.item);
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching inquiry data");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching inquiry data");
        }
    }
}



// Financial Sheet
const invoicesData = async (req, res) => {
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;
    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_invoice?sap-client=100";

    const soapBody = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmInvoiceDetails>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZfmInvoiceDetails>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const finalResult = result["env:Envelope"]["env:Body"]["n0:ZfmInvoiceDetailsResponse"];

        res.status(200).send(finalResult.InvoiceData.item);
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching invoice data");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching invoice data");
        }
    }


}
const invoiceDownload = async (req, res) => {
    const { vebln } = req.params;
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;
    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_invoice_report?sap-client=100";
    const soapBody = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerInvoiceReport>
                <CustomerId>${customerId}</CustomerId>
                <Vbeln>${vebln}</Vbeln>
            </urn:ZfmCustomerInvoiceReport>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const finalResult = result["env:Envelope"]["env:Body"]["n0:ZfmCustomerInvoiceReportResponse"];

        if (finalResult.InvoicePdf && finalResult.InvoicePdf.length > 0) {
            // Convert base64 string to binary data
            const invoicePdfBuffer = Buffer.from(finalResult.InvoicePdf, 'base64');

            // Set headers for file download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice_${vebln}.pdf`);
            res.setHeader('Content-Length', invoicePdfBuffer.length);

            // Send the PDF file
            return res.status(200).send(invoicePdfBuffer);
        }else{
            res.status(404).send("Invoice not found");
        }

        // for the above backend sample frontend code in angular:
        // downloadAndPreviewPdf(vebln: string) {
        //     this.http.get(`your-api-endpoint/invoice/${vebln}`, {
        //         responseType: 'blob' // Important: get the response as a Blob
        //     }).subscribe({
        //         next: (pdfBlob: Blob) => {
        //             // Create a URL for the blob
        //             const fileURL = URL.createObjectURL(pdfBlob);

        //             // Open the URL in a new tab
        //             window.open(fileURL);

        //             // Optional: You can revoke the object URL later to free memory
        //             // setTimeout(() => URL.revokeObjectURL(fileURL), 10000);
        //         },
        //         error: (err) => {
        //             console.error('Error downloading PDF:', err);
        //         }
        //     });
        // }


        // res.status(200).send(finalResult.InvoicePdf);

        // if (finalResult.InvoiceData && finalResult.InvoiceData) {
        //     res.status(200).send(finalResult);
        // } else {
        //     res.status(404).send("Invoice not found");
        // }
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching invoice download data");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching invoice download data");
        }
    }
}
const paymentsAgingData = async (req, res) => {
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;
    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_aging_pm?sap-client=100";
    const soapBody = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerAgingPm>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZfmCustomerAgingPm>
        </soap:Body>

    </soap:Envelope>
    `;
    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const finalResult = result["env:Envelope"]["env:Body"]["n0:ZfmCustomerAgingPmResponse"];

        res.status(200).send(finalResult.CustomerAging.item);
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching payments aging data");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching payments aging data");
        }
    }
}
const creditDebitData = async (req, res) => {
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;
    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_credit_debit_memo?sap-client=100";

    const soapBody = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerCreditDebitMemo>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZfmCustomerCreditDebitMemo>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const finalResult = result["env:Envelope"]["env:Body"]["n0:ZfmCustomerCreditDebitMemoResponse"];

        res.status(200).send(finalResult.MemoData.item);
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching credit/debit data");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching credit/debit data");
        }
    }
}
const salesOverviewData = async (req, res) => {
    const customerId = req.customerId;

    const { SAP_USERNAME, SAP_PASSWORD } = process.env;
    const url = "http://AZKTLDS5CP.kcloud.com:8000/sap/bc/srt/scs/sap/zsd_customer_sales_overview?sap-client=100";

    const soapBody = `
        <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:urn="urn:sap-com:document:sap:soap:functions:mc-style">
        <soap:Header/>
        <soap:Body>
            <urn:ZfmCustomerSalesOverview>
                <CustomerId>${customerId}</CustomerId>
            </urn:ZfmCustomerSalesOverview>
        </soap:Body>
    </soap:Envelope>
    `;

    try {
        const response = await axios.post(url, soapBody, {
            headers: {
                'Content-Type': 'application/soap+xml;charset=UTF-8',
            },
            auth: {
                username: SAP_USERNAME,
                password: SAP_PASSWORD,
            },
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        const finalResult = result["env:Envelope"]["env:Body"]["n0:ZfmCustomerSalesOverviewResponse"];

        res.status(200).send(finalResult.SalesOverviewData.item);
    } catch (error) {
        if (error.response) {
            console.error("❌ SAP Web Service Error:", error.response.data);
            res.status(500).send("Error fetching sales overview data");
        } else {
            console.error("❌ Request Failed:", error.message);
            res.status(500).send("Error fetching sales overview data");
        }
    }
}


module.exports = {
    login,
    logout,
    profile,
    inquiryData,
    salesOrderData,
    deliveriesrData,
    invoicesData,
    invoiceDownload,
    paymentsAgingData,
    creditDebitData,
    salesOverviewData
};
