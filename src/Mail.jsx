import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import mail_api from "./mail_api";
import "./Mail.css";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const INBOX_CACHE = "umail_inbox_cache";
const SENT_CACHE = "umail_sent_cache";

export default function Mail() {
  const navigate = useNavigate();

  const [page, setPage] = useState("inbox");
  const [mails, setMails] = useState([]);
  const [selected, setSelected] = useState(null);

  const [receiverEmail, setReceiverEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [attachments, setAttachments] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Page loading and sending are separated
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloadingId, setDownloadingId] =
    useState(null);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  // Used to cancel stale requests
  const abortControllerRef = useRef(null);

  // Prevent duplicate operations
  const sendingRef = useRef(false);
  const downloadingRef = useRef(false);

  const isUmailAddress = useCallback(
    (email) => {
      return /^[a-zA-Z0-9._%+-]+@umail\.com$/.test(
        email.toLowerCase().trim()
      );
    },
    []
  );

  const formatFileSize = useCallback(
    (bytes) => {
      if (!bytes) return "0 B";

      if (bytes < 1024) {
        return `${bytes} B`;
      }

      if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
      }

      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(2)} MB`;
    },
    []
  );

  // ==================================================
  // CACHE HELPERS
  // ==================================================

  const getCache = useCallback(
    (key) => {
      try {
        const cached =
          sessionStorage.getItem(key);

        if (!cached) {
          return null;
        }

        const parsed =
          JSON.parse(cached);

        return Array.isArray(parsed)
          ? parsed
          : null;
      } catch {
        return null;
      }
    },
    []
  );

  const setCache = useCallback(
    (key, data) => {
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify(data)
        );
      } catch {
        // Ignore storage errors
      }
    },
    []
  );

  // ==================================================
  // FILES
  // ==================================================

  const handleFiles = useCallback(
    (e) => {
      const files =
        Array.from(
          e.target.files || []
        );

      setError("");

      if (!files.length) {
        return;
      }

      const accepted = [];
      const rejected = [];

      for (const file of files) {
        if (
          file.size >
          MAX_FILE_SIZE
        ) {
          rejected.push(
            `${file.name} is larger than 100 MB`
          );

          continue;
        }

        accepted.push(file);
      }

      if (rejected.length > 0) {
        setError(
          rejected.join(". ")
        );
      }

      setAttachments(
        accepted
      );

      // Allow selecting same file again
      e.target.value = "";
    },
    []
  );

  const removeAttachment =
    useCallback(
      (index) => {
        setAttachments(
          (current) =>
            current.filter(
              (_, i) =>
                i !== index
            )
        );
      },
      []
    );

  // ==================================================
  // LOAD INBOX
  // ==================================================

  const loadInbox = useCallback(
    async () => {
      // Cancel previous request
      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      try {
        const cached =
          getCache(
            INBOX_CACHE
          );

        // Show cached data immediately
        if (cached) {
          setMails(cached);
        }

        // Only show loading if there is
        // no cached data
        if (!cached) {
          setLoading(true);
        }

        setError("");

        const response =
          await mail_api.get(
            "/mail/inbox",
            {
              signal:
                controller.signal
            }
          );

        const newMails =
          response.data.mails ||
          [];

        setMails(
          newMails
        );

        setCache(
          INBOX_CACHE,
          newMails
        );
      } catch (err) {
        if (
          err.name ===
          "CanceledError" ||
          err.name ===
          "AbortError" ||
          err.code ===
          "ERR_CANCELED"
        ) {
          return;
        }

        console.error(
          "Inbox error:",
          err
        );

        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load inbox"
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    },
    [getCache, setCache]
  );

  // ==================================================
  // LOAD SENT
  // ==================================================

  const loadSent = useCallback(
    async () => {
      // Cancel previous request
      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      try {
        const cached =
          getCache(
            SENT_CACHE
          );

        // Show cached data immediately
        if (cached) {
          setMails(cached);
        }

        // Only show loading if there is
        // no cached data
        if (!cached) {
          setLoading(true);
        }

        setError("");

        const response =
          await mail_api.get(
            "/mail/sent",
            {
              signal:
                controller.signal
            }
          );

        const newMails =
          response.data.mails ||
          [];

        setMails(
          newMails
        );

        setCache(
          SENT_CACHE,
          newMails
        );
      } catch (err) {
        if (
          err.name ===
          "CanceledError" ||
          err.name ===
          "AbortError" ||
          err.code ===
          "ERR_CANCELED"
        ) {
          return;
        }

        console.error(
          "Sent error:",
          err
        );

        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load sent mail"
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    },
    [getCache, setCache]
  );

  // ==================================================
  // LOAD MAILS
  // ==================================================

  useEffect(() => {
    if (page === "inbox") {
      loadInbox();
    }

    if (page === "sent") {
      loadSent();
    }

    return () => {
      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    page,
    loadInbox,
    loadSent
  ]);

  // ==================================================
  // CHANGE PAGE
  // ==================================================

  const changePage = useCallback(
    (nextPage) => {
      if (page === nextPage) {
        return;
      }

      setSelected(null);
      setMessage("");
      setError("");
      setUploadProgress(0);

      setPage(nextPage);
    },
    [page]
  );

  // ==================================================
  // SEND MAIL
  // ==================================================

  const sendMail = async (e) => {
    e.preventDefault();

    if (sendingRef.current) {
      return;
    }

    setError("");
    setMessage("");
    setUploadProgress(0);

    const email =
      receiverEmail
        .toLowerCase()
        .trim();

    // Only @umail.com
    if (
      !isUmailAddress(email)
    ) {
      setError(
        "Only @umail.com email addresses are allowed."
      );

      return;
    }

    // Check every file again
    const oversizedFile =
      attachments.find(
        (file) =>
          file.size >
          MAX_FILE_SIZE
      );

    if (oversizedFile) {
      setError(
        `${oversizedFile.name} is larger than 100 MB.`
      );

      return;
    }

    if (
      !body.trim() &&
      attachments.length === 0
    ) {
      setError(
        "Message or attachment is required."
      );

      return;
    }

    try {
      sendingRef.current = true;

      setSending(true);

      const formData =
        new FormData();

      formData.append(
        "receiverEmail",
        email
      );

      formData.append(
        "subject",
        subject.trim()
      );

      formData.append(
        "body",
        body.trim()
      );

      attachments.forEach(
        (file) => {
          formData.append(
            "attachments",
            file
          );
        }
      );

      await mail_api.post(
        "/mail/send",
        formData,
        {
          onUploadProgress:
            (progressEvent) => {
              if (
                progressEvent.total
              ) {
                const percent =
                  Math.round(
                    (progressEvent.loaded /
                      progressEvent.total) *
                      100
                  );

                setUploadProgress(
                  percent
                );
              }
            }
        }
      );

      setReceiverEmail("");
      setSubject("");
      setBody("");
      setAttachments([]);
      setUploadProgress(0);

      setMessage(
        "Message sent successfully."
      );

      // Sent cache is stale
      sessionStorage.removeItem(
        SENT_CACHE
      );

      setPage("sent");
    } catch (err) {
      console.error(
        "Send mail error:",
        err
      );

      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to send message."
      );
    } finally {
      sendingRef.current = false;

      setSending(false);
    }
  };

  // ==================================================
  // OPEN MAIL
  // ==================================================

  const openMail = async (
    mail
  ) => {
    setSelected(mail);
    setError("");

    if (
      page === "inbox" &&
      !mail.read
    ) {
      // Optimistic update
      const updatedMail = {
        ...mail,
        read: true
      };

      setSelected(
        updatedMail
      );

      setMails(
        (current) =>
          current.map(
            (item) =>
              item._id ===
                mail._id
                ? updatedMail
                : item
          )
      );

      // Update cache immediately
      const cached =
        getCache(
          INBOX_CACHE
        );

      if (cached) {
        setCache(
          INBOX_CACHE,
          cached.map(
            (item) =>
              item._id ===
                mail._id
                ? updatedMail
                : item
          )
        );
      }

      // API request happens in background
      try {
        await mail_api.put(
          `/mail/${mail._id}/read`
        );
      } catch (err) {
        console.error(
          "Mark as read failed:",
          err
        );
      }
    }
  };

  // ==================================================
  // DOWNLOAD ATTACHMENT
  // ==================================================

  const downloadAttachment =
    async (
      mailId,
      attachment
    ) => {
      if (
        downloadingRef.current
      ) {
        return;
      }

      try {
        downloadingRef.current =
          true;

        setDownloadingId(
          attachment._id
        );

        setError("");

        const response =
          await mail_api.get(
            `/mail/${mailId}/attachments/${attachment._id}`,
            {
              responseType:
                "blob"
            }
          );

        const url =
          window.URL.createObjectURL(
            response.data
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          attachment.originalName ||
          attachment.filename;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        // Give browser a little time
        // before releasing the blob
        setTimeout(() => {
          window.URL.revokeObjectURL(
            url
          );
        }, 1000);
      } catch (err) {
        console.error(
          "Download error:",
          err
        );

        setError(
          err.response?.data?.message ||
          err.message ||
          "Failed to download attachment."
        );
      } finally {
        downloadingRef.current =
          false;

        setDownloadingId(
          null
        );
      }
    };

  // ==================================================
  // BACK TO ACCOUNT
  // ==================================================

  const handleBackToAccount =
    useCallback(() => {
      navigate("/");
    }, [navigate]);

  // ==================================================
  // SELECTED MAIL
  // ==================================================

  if (selected) {
    return (
      <div className="mail-page">

        <div className="mail-topbar">

          <button
            className="mail-back"
            onClick={() =>
              setSelected(null)
            }
          >
            ← Back
          </button>

          <button
            className="mail-account-btn"
            onClick={
              handleBackToAccount
            }
          >
            Account
          </button>

        </div>

        {error && (
          <div className="mail-alert error">

            {error}

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>
        )}

        <article className="mail-message-card">

          <div className="mail-message-title">

            <h1>
              {selected.subject ||
                "(No subject)"}
            </h1>

          </div>

          <div className="mail-message-meta">

            <div className="mail-big-avatar">
              {selected.senderEmail
                ?.charAt(0)
                ?.toUpperCase() || "?"}
            </div>

            <div className="mail-sender">

              <strong>
                {selected.senderEmail}
              </strong>

              <span>
                to{" "}
                {selected.receiverEmail}
              </span>

            </div>

            <time>
              {new Date(
                selected.createdAt
              ).toLocaleString()}
            </time>

          </div>

          {selected.body && (
            <div className="mail-message-body">
              {selected.body}
            </div>
          )}

          {/* ATTACHMENTS */}

          {selected.attachments &&
            selected.attachments.length >
              0 && (

              <div className="mail-attachments-view">

                <h3>
                  Attachments
                </h3>

                <div className="mail-attachment-list">

                  {selected.attachments.map(
                    (attachment) => (

                      <button
                        key={
                          attachment._id
                        }
                        className="mail-attachment-download"
                        onClick={() =>
                          downloadAttachment(
                            selected._id,
                            attachment
                          )
                        }
                        disabled={
                          downloadingId ===
                          attachment._id
                        }
                      >

                        <span className="attachment-icon">
                          📎
                        </span>

                        <span className="attachment-info">

                          <strong>
                            {attachment.originalName ||
                              attachment.filename}
                          </strong>

                          <small>
                            {formatFileSize(
                              attachment.size
                            )}
                          </small>

                        </span>

                        <span className="attachment-download-icon">

                          {downloadingId ===
                          attachment._id
                            ? "..."
                            : "↓"}

                        </span>

                      </button>

                    )
                  )}

                </div>

              </div>

            )}

        </article>

      </div>
    );
  }

  // ==================================================
  // COMPOSE
  // ==================================================

  if (page === "compose") {
    return (
      <div className="mail-page">

        <div className="mail-topbar">

          <div>

            <h1 className="mail-title">
              Compose
            </h1>

            <p className="mail-subtitle">
              Send a message to another
              U-Mail user
            </p>

          </div>

          <button
            className="mail-account-btn"
            onClick={
              handleBackToAccount
            }
          >
            Account
          </button>

        </div>


        <div className="mail-tabs">

          <button
            onClick={() =>
              changePage("inbox")
            }
          >
            Inbox
          </button>

          <button
            onClick={() =>
              changePage("sent")
            }
          >
            Sent
          </button>

          <button className="active">
            Compose
          </button>

        </div>


        {error && (
          <div className="mail-alert error">

            {error}

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>
        )}


        {message && (
          <div className="mail-alert success">

            {message}

            <button
              onClick={() =>
                setMessage("")
              }
            >
              ×
            </button>

          </div>
        )}


        <section className="mail-compose-card">

          <form onSubmit={sendMail}>

            {/* TO */}

            <div className="mail-field">

              <label>
                To
              </label>

              <input
                type="email"
                placeholder="recipient@umail.com"
                value={receiverEmail}
                onChange={(e) =>
                  setReceiverEmail(
                    e.target.value
                  )
                }
                pattern="^[a-zA-Z0-9._%+-]+@umail\.com$"
                title="Only @umail.com email addresses are allowed"
                required
              />

              <small className="mail-hint">
                Only @umail.com addresses
                are supported.
              </small>

            </div>


            {/* SUBJECT */}

            <div className="mail-field">

              <label>
                Subject
              </label>

              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) =>
                  setSubject(
                    e.target.value
                  )
                }
              />

            </div>


            {/* MESSAGE */}

            <div className="mail-field">

              <label>
                Message
              </label>

              <textarea
                placeholder="Write your message..."
                value={body}
                onChange={(e) =>
                  setBody(
                    e.target.value
                  )
                }
              />

            </div>


            {/* ATTACHMENTS */}

            <div className="mail-field">

              <label>
                Attach files
              </label>

              <input
                type="file"
                multiple
                onChange={
                  handleFiles
                }
              />

              <small className="mail-hint">
                Photos, videos, documents
                and other files up to
                100 MB each.
              </small>

            </div>


            {/* SELECTED FILES */}

            {attachments.length >
              0 && (

              <div className="selected-files">

                {attachments.map(
                  (file, index) => (

                    <div
                      className="selected-file"
                      key={`${file.name}-${file.size}-${index}`}
                    >

                      <div className="selected-file-info">

                        <span>
                          📎
                        </span>

                        <div>

                          <strong>
                            {file.name}
                          </strong>

                          <small>
                            {formatFileSize(
                              file.size
                            )}
                          </small>

                        </div>

                      </div>


                      <button
                        type="button"
                        className="remove-file"
                        onClick={() =>
                          removeAttachment(
                            index
                          )
                        }
                      >
                        ×
                      </button>

                    </div>

                  )
                )}

              </div>

            )}


            {/* UPLOAD PROGRESS */}

            {sending &&
              uploadProgress >
                0 && (

                <div className="mail-progress">

                  <div className="mail-progress-track">

                    <div
                      className="mail-progress-value"
                      style={{
                        width:
                          `${uploadProgress}%`
                      }}
                    />

                  </div>

                  <span>
                    Uploading{" "}
                    {uploadProgress}%
                  </span>

                </div>

              )}


            <div className="mail-compose-footer">

              <button
                type="submit"
                className="mail-send-btn"
                disabled={
                  sending
                }
              >
                {sending
                  ? "Sending..."
                  : "Send message"}
              </button>

            </div>

          </form>

        </section>

      </div>
    );
  }

  // ==================================================
  // INBOX / SENT
  // ==================================================

  return (
    <div className="mail-page">

      <div className="mail-topbar">

        <div>

          <h1 className="mail-title">
            YourMail
          </h1>

          <p className="mail-subtitle">

            {page === "inbox"
              ? "Messages you received"
              : "Messages you sent"}

          </p>

        </div>


        <button
          className="mail-account-btn"
          onClick={
            handleBackToAccount
          }
        >
          Account
        </button>

      </div>


      <div className="mail-tabs">

        <button
          className={
            page === "inbox"
              ? "active"
              : ""
          }
          onClick={() =>
            changePage("inbox")
          }
        >
          Inbox
        </button>


        <button
          className={
            page === "sent"
              ? "active"
              : ""
          }
          onClick={() =>
            changePage("sent")
          }
        >
          Sent
        </button>


        <button
          className="compose-tab"
          onClick={() =>
            changePage("compose")
          }
        >
          + Compose
        </button>

      </div>


      {error && (

        <div className="mail-alert error">

          {error}

          <button
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>

        </div>

      )}


      {message && (

        <div className="mail-alert success">

          {message}

          <button
            onClick={() =>
              setMessage("")
            }
          >
            ×
          </button>

        </div>

      )}


      {loading && (
        <div className="mail-loading">

          <div className="mail-spinner" />

          <span>
            Loading messages...
          </span>

        </div>
      )}


      {!loading &&
        mails.length === 0 && (

          <div className="mail-empty">

            <div className="mail-empty-icon">
              ✉
            </div>

            <h2>

              {page === "inbox"
                ? "Your inbox is empty"
                : "No sent messages"}

            </h2>

            <p>

              {page === "inbox"
                ? "Messages you receive will appear here."
                : "Messages you send will appear here."}

            </p>


            {page === "inbox" && (

              <button
                className="mail-send-btn"
                onClick={() =>
                  changePage(
                    "compose"
                  )
                }
              >
                Compose message
              </button>

            )}

          </div>

        )}


      {!loading &&
        mails.length > 0 && (

          <div className="mail-list">

            {mails.map((mail) => {

              const person =
                page === "inbox"
                  ? mail.senderEmail
                  : mail.receiverEmail;

              const attachmentCount =
                mail.attachments?.length ||
                0;

              return (

                <button
                  key={mail._id}
                  className={
                    mail.read
                      ? "mail-row"
                      : "mail-row unread"
                  }
                  onClick={() =>
                    openMail(
                      mail
                    )
                  }
                >

                  <div className="mail-avatar">

                    {person
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "?"}

                  </div>


                  <div className="mail-info">

                    <strong>
                      {person}
                    </strong>


                    <span>

                      {mail.subject ||
                        "(No subject)"}

                      {attachmentCount >
                        0 && (

                        <span className="attachment-count">
                          {" "}
                          📎{" "}
                          {attachmentCount}
                        </span>

                      )}

                    </span>


                    <small>

                      {mail.body
                        ? mail.body.length >
                          100
                          ? mail.body.slice(
                              0,
                              100
                            ) + "..."
                          : mail.body
                        : attachmentCount >
                          0
                          ? "Attachment"
                          : ""}

                    </small>

                  </div>


                  <time>

                    {new Date(
                      mail.createdAt
                    ).toLocaleDateString()}

                  </time>

                </button>

              );
            })}

          </div>

        )}

    </div>
  );
}